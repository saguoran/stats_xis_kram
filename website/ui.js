// ui.js
import {
  state,
  loadFromStorage,
  getNextScheduledDate,
  saveToStorage,
  syncMarkSixData,
  PAGES,
  getData,
  DATASETS,
  defaultState,
} from "./state.js";
import {
  setAnalysisData,
  allEntries,
  snoEntries,
  slicedData,
  updateDataOffset,
} from "./analysis.js";
import {
  _,
  _a,
  _av,
  _els,
  uiMap,
  renderLimitedRangeText,
  renderDataAnalysis,
  renderReverseBtnText,
  renderStatusMsg,
  render,
  setupHighlight,
} from "./templates.js";

// Toggle this to false when you want to see logs in Dev
const isProduction = true; 

if (isProduction) {
    console.log = () => {}; // This "shorts out" all logs globally
}

let lastHightedElement;
export async function navigateTo(targetPage, targetData = null) {
  console.log("navigate to " + targetPage, state);
  // 2. Update specific state values
  state.currentPage = targetPage;
  // 4. Update the Browser History (for Back/Forward support)
  const url = new URL(window.location);
  url.searchParams.set("page", state.currentPage);
  window.history.pushState({ ...state }, "", url);
  saveToStorage(); // Save the updated state to localStorage
  // 5. Final Render
  render();
}

// ui.js
window.addEventListener("popstate", (event) => {
  // If the user went forward/backward to a valid state entry
  // console.log(event);
  if (event.state && event.state.currentPage) {
    state.currentPage = event.state.currentPage;
    // IMPORTANT: Call render directly, NOT syncUI
    // syncUI would push a NEW entry into history, breaking the chain
    render();
  } else {
    // Handle cases where there is no state (like the very first page load)
    // handleInitialLoad();
  }
});
function getRoute() {
  const params = new URLSearchParams(window.location.search);
  return {
    page: params.get("page") || PAGES.analysis, // Fallback to 'page1' if empty
  };
}

function resetFilter() {
  state.filters.index = 0;
  state.filters.limitCount = 50;
  let newLimitCount = state.filters.limitCount;
  let [start, end] = updateDataOffset(
    state.filters.index,
    0,
    newLimitCount,
    getData().data.length,
  );
}
async function initApp() {
  console.log("Initializing App...", state);
  state.currentPage = PAGES.loading;
  render();
  try {
    await syncMarkSixData(getRoute().page, renderStatusMsg);
    render();
    // throw Error();
  } catch (error) {
    console.error(error);
    state.currentPage = "404";
    render();
    return;
  }
  // set page data
  try {
    let newLimitCount = state.filters.limitCount;
    // direction=0
    setDataByPosVectorOrLimitCount();
    renderDataGrid();
  } catch (error) {
    console.error("no need to fix this error, it doesn't break the app", error);
    resetFilter();
  }
}
document.addEventListener("click", (e) => {
  // highlight element
  if (e.target.hasAttribute(_a.data_highlight)) {
    if (lastHightedElement) {
      lastHightedElement.setAttribute(_a.data_highlight, "");
    }
    e.target.setAttribute(_a.data_highlight, "true");
    lastHightedElement = e.target;
  }
  // console.log(e.target);
  if (e.target.id === "page-switch") {
    e.preventDefault();
    navigateTo(
      state.currentPage === PAGES.analysis ? PAGES.datalist : PAGES.analysis,
    );
  }
  let formUpdated = true;
  if (_(e.target).matchesAttr(_a.data_sort, "reversed")) {
    renderDataGrid();
    state.filters.reversed = !state.filters.reversed;
    e.target.textContent = renderReverseBtnText();
  } else if (
    _(e.target).matchesAttr(_a.data_sort, "sortByNumber") &&
    state.filters.orderBy != "number"
  ) {
    // console.log(e.target);
    state.filters.orderBy = "number";    
    _(e.target).activate();
    _els().sortByCountBtn.deactivate();
  } else if (
    _(e.target).matchesAttr(_a.data_sort, "sortByCount") &&
    state.filters.orderBy != "count"
  ) {
    state.filters.orderBy = "count";
    _(e.target).activate();
    _els().sortByNumberBtn.deactivate();
  } else if (
    e.target.hasAttribute(_a.data_limit) &&
    state.filters.limitCount != e.target.getAttribute(_a.data_limit)
  ) {
    // console.log(e.target.getAttribute(_a.data_limit));
    // inactive the previous selected limited count button
    const prevSelectedBtn = _(
      `button[data-limit='${state.filters.limitCount}']`,
    );
    try {
      let newLimitCount = parseInt(e.target.getAttribute(_a.data_limit));
      
      setDataByPosVectorOrLimitCount({limitCount:newLimitCount});
      prevSelectedBtn.deactivate();
      // active the new limit button
      state.filters.limitCount = newLimitCount;
      _(e.target).activate();
    } catch (error) {
      console.error(
        "no need to fix this error, it doesn't break the app",
        error,
      );
      return;
    }
  } else if (e.target.hasAttribute(_a.pos_vector)) {
    // set offset
    try {
      let posVector = -e.target.getAttribute(_a.pos_vector);
      setDataByPosVectorOrLimitCount({actionVector:posVector});
    } catch (error) {
      console.error(
        "no need to fix this error, it doesn't break the app",
        error,
      );
      return;
    }
    console.log(e.target);
  } else {
    formUpdated = false;
  }
  if (formUpdated) {
    renderDataGrid();
    saveToStorage();
  }
});

function setDataByPosVectorOrLimitCount({actionVector=0, index=state.filters.index,limitCount=state.filters.limitCount}={}) {
  console.log(actionVector, index,limitCount);
  let [start, end] = updateDataOffset(
    actionVector,
    index,
    limitCount,
    getData().data.length,
  );
  console.log(actionVector,index,limitCount);
  console.log(start, end);
  
  
  if (start <= 0) {
    _('[data-pos-vector="1"]').disable();
    _("[data-meta-latest]").el.textContent = "今期";
  } else {
    _('[data-pos-vector="1"]').enable();
  }
  if (end >= getData().data.length) {
    _('[data-pos-vector="-1"]').disable();
    _("[data-meta-latest]").el.textContent = `最旧${slicedData.length}期`;
    console.log(getData().data.slice(start, end).length);
  } else {
    _('[data-pos-vector="-1"]').enable();
  }
  setAnalysisData(getData().data, ...[start, end]);
  state.filters.index = start;
    _("#limit-range").el.innerHTML = renderLimitedRangeText();
    // renderDataGrid();
}

function renderDataGrid(){
      _("div[data-analysis='sno']").el.innerHTML = renderDataAnalysis(snoEntries);
    _("div[data-analysis='all']").el.innerHTML = renderDataAnalysis(allEntries);
}

function syncUrlWithDefaults() {
  const params = new URLSearchParams(window.location.search);
  let updated = false;

  // reset filters for test
  // state.filters.limitCount = 50;
  // state.filters.offset = 0;

  if (state.currentPage === PAGES.analysis) {
    // set params  by default value if missing
    Object.keys(defaultState.filters).forEach((key) => {
      if (!params.has(key)) {
        params.set(key, defaultState.filters[key]);
        updated = true;
      }
      if(!Object.hasOwn(state.filters,key)){
        state.filters[key] = params.get(key);
      }
    });
    console.log(params, params.toString(), state);
  }

  // If we added missing params, update the address bar quietly
  if (updated) {
    // saveToStorage();
    const newRelativePathQuery =
      window.location.pathname + "?" + params.toString();
    // window.history.replaceState(null, '', newRelativePathQuery);
    return newRelativePathQuery;
  }

  return window.location.href;
}
// ui.js - inside your initApp or DOMContentLoaded
window.addEventListener("DOMContentLoaded", async () => {
  
  syncUrlWithDefaults(),
  await initApp();
  // Set the initial history entry so 'Back' has a place to return to
  window.history.replaceState(
    {
      ...state,
    },
    "",
  );
  console.log(state);
});
