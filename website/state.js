export let syncStatusText = "";
// 1. Define constants to avoid typos
export const PAGES = {
  analysis: "analysis",
  datalist: "datalist",
  loading: "loading",
};

export const DATASETS = {
  HongKong: {
    /** @type {string} */
    name: "HongKong",
    cnName: "香港",
    url: "https://info.cld.hkjc.com/graphql/base/",
    /** @type {DrawResult[]} */
    data: [],
    /** to keep the stored data up-to-date, always fetch and set the latest result Id on DOMContentLoaded */
    lastResultId: null,
    /** latest scheduled Dates  */
    scheduledDates: {
      year: null,
      month: null,
      dates: null,
    },
  },
  Macao: {
    /** @type {string} */
    name: "Macao",
    cnName: "澳門",
    url: "https://history.macaumarksix.com/history/macaujc2/y/",
    /** @type {DrawResult[]} */
    data: [],
  },
};
export class DrawResult {
  constructor(id, date, no, sno) {
    this.id = id.slice(0, 4) + "/" + id.slice(4, -1); // Remove the last character
    this.date = date.slice(0, 10); // Keep only YYYY-MM-DD
    /** @type {number[]} */
    this.no = no;
    /** @type {number} */
    this.sno = sno;
  }
}
export const defaultState = {
  currentPage: PAGES.analysis, // Start at loading
  /** @type {"HongKong" | "Macao"} */
  activeDatasetName: "HongKong", // Default dataset
  // two datasets for easy switching {DATASETS}
  datasets: DATASETS,
  filters: {
    /** showing number of data, i.e. data[index+50], the index of the data*/
    limitCount: 50,
    orderBy: "number", // or "count"
    reversed: false,
    /** current vector, 0 index didn't move, 1 index increased by 1, i.e. data[index]  */
    index: 0,
  },
};

/** @returns {typeof DATASETS[keyof typeof DATASETS]} */
export function getData() {
  return state.datasets[state.activeDatasetName];
}

// 2. The Current State (Initial Values)
export let state = defaultState;
// Step 2: The "Save & Restore" state Logic
export function saveToStorage() {
  localStorage.setItem("site_state", JSON.stringify(state));
}

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  return { ...target, ...source };
}

/**
 * and make sure if the {state} got loaded from storage for the first or set default state
 * @returns stored state or default state
 */
export function loadFromStorage() {
  const saved = localStorage.getItem("site_state");
  if (saved) {
    // Overlay the saved data onto our initial state
    state = deepMerge(defaultState, JSON.parse(saved));
  }
  return state;
}

/**
 * @returns {Promise<string>}
 * Fetches the last result id and stores it in
 * state.datasets.HongKong.lastResultId
 */
async function fetchLatestMarkSixResult() {
  try {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      operationName: "marksixResult",
      variables: {
        lastNDraw: 1,
      },
      query:
        "fragment lotteryDrawsFragment on LotteryDraw {\n  id\n  year\n  no\n  openDate\n  closeDate\n  drawDate\n  status\n  snowballCode\n  snowballName_en\n  snowballName_ch\n  lotteryPool {\n    sell\n    status\n    totalInvestment\n    jackpot\n    unitBet\n    estimatedPrize\n    derivedFirstPrizeDiv\n    lotteryPrizes {\n      type\n      winningUnit\n      dividend\n    }\n  }\n  drawResult {\n    drawnNo\n    xDrawnNo\n  }\n}\n\nquery marksixResult($lastNDraw: Int, $startDate: String, $endDate: String, $drawType: LotteryDrawType) {\n  lotteryDraws(\n    lastNDraw: $lastNDraw\n    startDate: $startDate\n    endDate: $endDate\n    drawType: $drawType\n  ) {\n    ...lotteryDrawsFragment\n  }\n}",
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const response = await fetch(state.datasets.HongKong.url, requestOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const id = (await response.json()).data.lotteryDraws[0].id;
    const lastResultId = id.slice(0, 4) + "/" + id.slice(4, -1);
    state.datasets.HongKong.lastResultId = lastResultId;
    // saveToStorage();
    
    return lastResultId;
  } catch (error) {}
}
// fetchLatestMarkSixResult();
/**
 * Returns true if scheduled dates are current (same month & year), false if fetch needed
 */
function shouldNotFetchMarkSixScheduledDates() {
  // Check if scheduledDates exist
  const scheduledDate = state.datasets.HongKong.scheduledDates;
  if (!scheduledDate) return false;

  // Compare current month and year with stored scheduled dates
  const today = new Date();
  return (
    today.getMonth() + 1 === scheduledDate.month &&
    today.getFullYear() === scheduledDate.year
  );
}
/**
 * @returns {Date} scheduledDates
 */
async function fetchMarkSixScheduledDates() {
  try {
    const myHeaders = new Headers();
    myHeaders.append("sc_apikey", "{FF2309B7-E8BB-49B2-82A7-36AE0B48F171}");
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append(
      "Cookie",
      "ASP.NET_SessionId=emretr3lxa2dmzzt3jgpwbw3; website#lang=zh-HK",
    );

    const raw = JSON.stringify({
      operationName: "MarksixFixtures",
      variables: {
        path: "/sitecore/content/Sites/JCBW/NextDrawSchedule/Schedule",
        lang: "zh-HK",
      },
      query:
        'query MarksixFixtures($path: String!, $lang: String!) {\n  legends: item(\n    path: "/sitecore/content/Sites/JCBW/NextDrawSchedule/DrawTypeLegend"\n    language: $lang\n  ) {\n    children {\n      key: name\n      name: field(name: "LegendName") {\n        value\n      }\n    }\n  }\n  item(path: $path, language: $lang) {\n    years: children {\n      year: name\n      months: children {\n        key: name\n        month: field(name: "DrawMonth") {\n          value\n        }\n        dates: field(name: "NormalDrawDates") {\n          ... on MultilistField {\n            date: targetItems {\n              value: name\n            }\n          }\n        }\n        snowballs: field(name: "SnowballDrawDates") {\n          ... on MultilistField {\n            date: targetItems {\n              value: name\n            }\n          }\n        }\n        presales: field(name: "PresellDrawDates") {\n          ... on MultilistField {\n            date: targetItems {\n              value: name\n            }\n          }\n        }\n        header: field(name: "HeaderMessage") {\n          value\n        }\n        message: field(name: "MessageDetail") {\n          value\n        }\n      }\n    }\n  }\n}',
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const response = await fetch(
      "https://consvc.hkjc.com/JCBW/api/graph",
      requestOptions,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const latestYear = data.data.item.years[data.data.item.years.length - 1];
    const latestMonth = latestYear.months[latestYear.months.length - 1];
    const resultDates = latestMonth.dates.date.map((x) => parseInt(x.value));
    const scheduledDates = {
      year: parseInt(latestYear.year),
      month: parseInt(latestMonth.key),
      dates: resultDates,
    };
    
    state.datasets.HongKong.scheduledDates = scheduledDates;
    // saveToStorage();
    return scheduledDates;
  } catch (err) {
    console.error(err);
  }
}

/** calculate the next scheduled date */
export function getNextScheduledDate() {
  const lastScheduledDate = parseInt(
    state.datasets.HongKong.data[0].date.slice(-2),
  );
  
  for (const scheduledDate of state.datasets.HongKong.scheduledDates.dates) {
    if (scheduledDate > lastScheduledDate) {
      const nextScheduleDate = new Date(
        state.datasets.HongKong.scheduledDates.year,
        state.datasets.HongKong.scheduledDates.month - 1,
        scheduledDate,
      );
      const formatted = new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }).format(nextScheduleDate);

      
      return formatted;
    }
  }
}

// fetchMarkSixScheduledDates();
/**
 *  don't fetch data
 *    if we already have it in state
 *    if data is up to date (e.g. for Hong Kong, if we have today's data)
 *  if it returns true, we can skip the fetch and directly render the page with existing data
 * @param {Date} today
 * @returns boolean
 */
function shouldNotFetchMarkSixData() {
  return (
    // if data is not available in state, do fetch
    state.datasets.HongKong.data &&
    // if the first result id isn't the same as the last one, do fetch
    state.datasets.HongKong.lastResultId === state.datasets.HongKong.data[0]?.id
  );
}

/** returns list of @type {DrawResult} for Hong Kong dataset */
async function fetchMarkSixData() {
  try {
    // Use the state to decide which URL to hit
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    // Create todayString
    let today = new Date();
    let year = today.getFullYear();
    let month = String(today.getMonth() + 1).padStart(2, "0");
    let day = String(today.getDate()).padStart(2, "0");
    let todayString = `${year}${month}${day}`;
    let twoMonthAgo = new Date(today);
    twoMonthAgo.setMonth(today.getMonth() - 2);
    let twoMonthAgoYear = twoMonthAgo.getFullYear();
    let twoMonthAgoMonth = String(twoMonthAgo.getMonth() + 1).padStart(2, "0");
    let twoMonthAgoDay = String(twoMonthAgo.getDate()).padStart(2, "0");
    let twoMonthAgoString = `${twoMonthAgoYear}${twoMonthAgoMonth}${twoMonthAgoDay}`;
    
    let index = 0;
    let data = [];
    while (index < 4) {
      const raw = JSON.stringify({
        operationName: "marksixResult",
        variables: {
          lastNDraw: null,
          startDate: twoMonthAgoString,
          endDate: todayString,
          drawType: "All",
        },
        query:
          "fragment lotteryDrawsFragment on LotteryDraw {\n  id\n  year\n  no\n  openDate\n  closeDate\n  drawDate\n  status\n  snowballCode\n  snowballName_en\n  snowballName_ch\n  lotteryPool {\n    sell\n    status\n    totalInvestment\n    jackpot\n    unitBet\n    estimatedPrize\n    derivedFirstPrizeDiv\n    lotteryPrizes {\n      type\n      winningUnit\n      dividend\n    }\n  }\n  drawResult {\n    drawnNo\n    xDrawnNo\n  }\n}\n\nquery marksixResult($lastNDraw: Int, $startDate: String, $endDate: String, $drawType: LotteryDrawType) {\n  lotteryDraws(\n    lastNDraw: $lastNDraw\n    startDate: $startDate\n    endDate: $endDate\n    drawType: $drawType\n  ) {\n    ...lotteryDrawsFragment\n  }\n}",
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };
      const response = await fetch(DATASETS.HongKong.url, requestOptions);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data = [...data, ...(await response.json()).data.lotteryDraws];
      twoMonthAgo.setDate(twoMonthAgo.getDate() - 1);
      today = twoMonthAgo;
      year = today.getFullYear();
      month = String(today.getMonth() + 1).padStart(2, "0");
      day = String(today.getDate()).padStart(2, "0");
      todayString = `${year}${month}${day}`;
      twoMonthAgo = new Date(today);
      twoMonthAgo.setMonth(today.getMonth() - 2);
      twoMonthAgoYear = twoMonthAgo.getFullYear();
      twoMonthAgoMonth = String(twoMonthAgo.getMonth() + 1).padStart(2, "0");
      twoMonthAgoDay = String(twoMonthAgo.getDate()).padStart(2, "0");
      twoMonthAgoString = `${twoMonthAgoYear}${twoMonthAgoMonth}${twoMonthAgoDay}`;
      
      index++;
    }

    DATASETS.HongKong.data = data.map(
      (x) =>
        new DrawResult(
          x.id,
          x.drawDate,
          x.drawResult.drawnNo,
          x.drawResult.xDrawnNo,
        ),
    ); // Store the data in our central state
    // set hongkong dataset reference to the new data
    state.datasets.HongKong.data = DATASETS.HongKong.data; // Ensure the dataset reference is updated
    state.activeDatasetName = "HongKong"; // Set activeData to the dataset we just fetched
    // 
    // saveToStorage();
    return DATASETS.HongKong.data;
  } catch (error) {
    console.error("HTTP Fetch failed:", error);
    throw error;
  }
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStep(render, task) {
  render();
  await Promise.all([task(), delay(100)]);
}

async function showStatus(render, ms = 100) {
  render();
  await delay(ms);
}

/**
 *
 * @param {PAGES} redirectPage
 * @param {txt=>{}} render
 */
export async function syncMarkSixData(redirectPage, render) {
  //  localStorage.removeItem("site_state");

  

  // first status
  await showStatus((_) => render("开始同步数据"), 200);

  loadFromStorage();

  await runStep((_) => render("在获取最新结果"), fetchLatestMarkSixResult);

  const shouldFetchDates = !shouldNotFetchMarkSixScheduledDates();

  if (shouldFetchDates) {
    await runStep(
      (_) => render("在获取下期更新数据"),
      fetchMarkSixScheduledDates,
    );
  }

  const shouldFetchResults = !shouldNotFetchMarkSixData();

  if (shouldFetchResults) {
    await runStep((_) => render("在获取前8个月的数据"), fetchMarkSixData);
  }

  state.currentPage = redirectPage;
  saveToStorage();
  await showStatus((_) => render("同步完成"), 200);

  // last status
  
}
