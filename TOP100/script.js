console.log("script loaded");

const DATA_PATH = "../marksix_data/top100.json";
// const DATA_PATH = "../marksix_data/latest.json";
let data = [];
let snoEntries = null;
let allEntries = null;
let leastFrequentNumbers = null;
const SortType = {
  NUMBER: "number",
  COUNT: "count",
};
const sortButtons = {
  sortByNumButton: document.getElementById('sort-by-num'),
  sortByCountButton: document.getElementById('sort-by-count'),
}
let sortingType = SortType.NUMBER; // default sort by number
let sortingRemoveStyle = _=>sortButtons.sortByNumButton.classList.remove("activate");
const rangeValidationText = document.getElementById('range-validation');
async function loadJSON() {
  const res = await fetch(DATA_PATH);
  data = await res.json();
  console.log("Data loaded:");
  const dataList = document.getElementById("data-list");
  let allRowsHTML = ""; // Create a temporary string

  data.forEach((item, index) => {
    item.sno = Number(item.sno);
    const noList = item.no.map((n) => `<div>${n}</div>`).join("");

    // Build the string in memory (fast)
    allRowsHTML += `
    <div class="result-row header">
      <div style='flex:1;'>${index + 1}.</div>
      <div style='flex:2;'>${item.id}</div>
      <div style='flex:4;'>${item.date}</div>
      <div style='flex:6;' class='no-list'>${noList}</div>
      <div style='flex:1;' class='sno'>${item.sno}</div>
    </div>`;
  });

  // Update the DOM only ONCE (very fast)
  dataList.innerHTML = allRowsHTML;
}

function numbersCounter(start,end) {
  if(start>end){
    // console.log("开始期数必须小于等于结束期数,他们都必须大于0");
    rangeValidationText.style.display = 'block';
    rangeValidationText.innerText = "错误输入:开始期数要≤结束期数,他们都要>0";
    return;
  }else{
    rangeValidationText.style.display = 'none';
  }
  end = Number(end) || data.length;
  const slice = data.slice(start-1, end);

  const snoObj = {};
  const allObj = {};
  for (const item of slice) {
    item.sno = parseInt(item.sno);
    snoObj[item.sno] = (snoObj[item.sno] || 0) + 1;
    allObj[item.sno] = (allObj[item.sno] || 0) + 1;
    for (let n of item.no){
      n = parseInt(n);
       allObj[n] = (allObj[n] || 0) + 1;
      }
  }

  // ensure keys 1..49 exist and sort numerically
  const makeEntries = (obj) => {
    for (let i = 1; i <= 49; i++) if (!(i in obj)) obj[i] = 0;
    return Object.keys(obj).reduce((acc, a,b) => {
      acc.push([parseInt(a), obj[a]]);
      return acc;
    }, []);
  };

  snoEntries = makeEntries(snoObj);
  allEntries = makeEntries(allObj);

  // console.log("SNO:", snoObj);
  // console.log("SNO counts:", snoEntries);
  // console.log("All counts:", allEntries);
}

function sortByNumber(entries) {
  entries.sort((a, b) => Number(a[0]) - Number(b[0]));
}
function sortByCount(entries) {
  entries.sort((a, b) => a[1] - b[1] || Number(a[0]) - Number(b[0]));
} 

function renderStats() {
  // console.log("render stats");
  sortingRemoveStyle();
  if(sortingType === SortType.NUMBER) {
    sortByNumber(snoEntries);
    sortByNumber(allEntries);
    sortButtons.sortByNumButton.classList.add("activate");
    sortingRemoveStyle = _=>sortButtons.sortByNumButton.classList.remove("activate");
  }
  else if(sortingType === SortType.COUNT) {
    sortByCount(snoEntries);
    sortByCount(allEntries);    
    sortButtons.sortByCountButton.classList.add("activate");
    sortingRemoveStyle = _=>sortButtons.sortByCountButton.classList.remove("activate");
  }
    // 1. Process SNO Stats
  const statsContainer = document.getElementById("sno-stats");
  let snoHTML = ""; // Accumulator string

  snoEntries.forEach(([num, count]) => {
    snoHTML += `
    <div class="data-row header">
      <div>${num}</div>
      <div>${count}</div>
    </div>`;
  });
  statsContainer.innerHTML = snoHTML; // Single DOM update

  // 2. Process AllStats
  const allStatsContainer = document.getElementById("nosno-stats");
  let allStatsHTML = ""; // Accumulator string

  allEntries.forEach(([num, count]) => {
    allStatsHTML += `
    <div class="data-row header">
      <div>${num}</div>
      <div>${count}</div>
    </div>`;
  });
  allStatsContainer.innerHTML = allStatsHTML; // Single DOM update
}

function calculateLeastFrequent() {
  const startingIndex = 10;
  let head10 = data.slice(0, startingIndex);
  const allObj = {};
  for (const item of head10) {
    allObj[item.sno] = (allObj[item.sno] || 0) + 1;
    for (const n of item.no) allObj[n] = (allObj[n] || 0) + 1;
  }

}
async function initializeApp() {
  try {
    console.log("Starting...");
    await loadJSON();
    // 1. Kick off the heavy calculations
    numbersCounter(50); 
    renderStats();
    console.log("Counter finished");
    // 2. Give the browser one "breath" (frame) to render the new HTML
    // before taking away the white curtain.
    requestAnimationFrame(() => {
      const loader = document.getElementById('test');
      setTimeout(() => {
        loader.classList.remove('active');
        console.log("App ready!");
      }, 500); // 0.5s splash screen feel
    });

  } catch (e) {
    console.error("Critical Failure:", e);
  }
}
window.onload = initializeApp;

function openSection(sectionId, element) {
  // 1. Hide all content sections
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  // 2. Remove active state from all buttons
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.remove("active");
  });

  // 3. Show the chosen section and highlight the button
  document.getElementById(sectionId).classList.add("active");
  element.classList.add("active");

  // 4. Optional: Scroll to top when switching
  window.scrollTo(0, 0);
}
