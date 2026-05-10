// ui.js
import {
  state,
  loadFromStorage,
  getNextScheduledDate,
  saveToStorage,
  syncMarkSixData,
  getData,
  PAGES,
  DATASETS,
  defaultState,
} from "./state.js";
import {
  setAnalysisData,
  sortByNumber,
  sortByCount,
  allEntries,
  snoEntries,
  slicedData,
} from "./analysis.js";


export const _els = ()=>({
  sortByNumberBtn:_(`button[${_a.data_sort}='sortByNumber']`),
  sortByCountBtn:_("button[data-sort='sortByCount']"),
  prevBtn:null,
});


/** 
 * Centralized Attribute Registry 
 * Prevents typos and makes bulk-renaming easier.
 */
export const _a = {
  disabled: 'disabled',
  inactive: 'inactive',
  active: 'active',
  data_highlight: 'data-highlight',
  data_sort: 'data-sort',
  data_limit: 'data-limit',
  pos_vector: 'data-pos-vector',
}
/** 
 * Centralized Attribute values Registry 
 * Prevents typos and makes bulk-renaming easier.
 */
export const _av = {
  sortByNumber: 'sortByNumber',
  reversed: 'reversed',
  number: 'number',
} 
/**
 * @param {string|HTMLElement} target
 */
export const _ = (target) => {
  // If target is already an element, use it; otherwise, search the DOM
  const el =
    target instanceof HTMLElement ? target : document.querySelector(target);
  if (!el) console.warn(`Element not found: ${target}`);
  return {
    el,
    matchesAttr(key, val) {
      if (!this.el) return false;
      // Using your _a registry for safety
      return this.el.getAttribute(key) === String(val);
    },
    enable() {
      if (this.el) {
        this.el.removeAttribute(_a.disabled);
        this.el.classList.remove(_a.inactive);
        this.el.classList.add(_a.active);
      }
      return this;
    },
    disable() {
      if (this.el) {
        this.el.setAttribute(_a.disabled, '');
        this.el.classList.remove(_a.active);
        this.el.classList.add(_a.inactive);
      }
      return this;
    },
    /** Removes 'inactive' and adds 'active' classes */
    activate() {
      this.el?.classList.remove(_a.inactive);
      this.el?.classList.add(_a.active);
      return this; // This allows the "Chain"
    },
    deactivate() {
      this.el?.classList.remove(_a.active);
      this.el?.classList.add(_a.inactive);
      return this;
    },
    // You can add more dashboard-specific tools here
    setTextContent(val) {
      // Use a standard if check for assignment
      if (this.el) {
        this.el.textContent = val;
      }
      return this;
    },
  };
};



/**
 * Render the visible ID/date range for the currently selected slice.
 * @returns {string}
 */
export const renderLimitedRangeText = () => `<div> ${slicedData[slicedData.length - 1]?.id}期➡️${slicedData[0]?.id}期</div>
    <div> ${slicedData[slicedData.length - 1]?.date}➡️${slicedData[0]?.date}</div>`;

/**
 * Render the text for the reverse order toggle button.
 * @returns {string}
 */
export const renderReverseBtnText = () =>
  !state.filters.reversed ? "顺序⬇️" : "倒序⬆️";

/**
 * Render the analysis grid items for the specified entries.
 * @param {Array<[number,string]>} entries - The entries to render in the analysis grid.
 * @returns {string}
 */
export const renderDataAnalysis = (entries) => {
  if (!entries) return "";
  if (state.filters.orderBy == "number") {
    sortByNumber(entries, state.filters.reversed);
  } else {
    sortByCount(entries, state.filters.reversed);
  }
  return `${entries
    .map(
      ([num, count]) => `
                        <div class="grid-item">
                             <strong>${num}</strong> <div>${count}</div> </div>`,
    )
    .join("")}`;
};

/**
 * Collection of reusable render helpers used by the UI.
 * @namespace templates
 */
export const templates = {
  renderLimitedRangeText,
  renderReverseBtnText,
  renderDataAnalysis,
};

// Inside your UIMap in ui.js

export function renderStatusMsg(msg) {
  const statusElement = document.getElementById("status-message");
  if (statusElement) statusElement.textContent = msg;
}
// This function controls the HTML transitions
export function render() {
  console.log(`render ${state.currentPage}`);
  const app = document.getElementById("app");
  const page = uiMap(state.currentPage);
  if (page) {
    app.innerHTML = page; // Execute the function to get HTML string
  } else {
    app.innerHTML = "<h1>404 - 数据同步失败</h1>";
  }
  setupHighlight();
}

export function uiMap(page) {
  switch (page) {
    case PAGES.loading:
      return `
        <div class="loader-container">
              <div id="test" class="loader-overlay active">
        <div class="loader-container">
            <svg viewBox="0 0 220 220" class="loader-svg">
                <circle cx="110" cy="110" r="50" fill="none" stroke="cyan" stroke-width="1" />
                <g class="inner-hex-spin">
                    <polygon points="110,60 153.3,135 66.7,135" fill="none" stroke="purple" stroke-width="1" />
                    <polygon points="110,160 66.7,85 153.3,85" fill="none" stroke="pink" stroke-width="1" />
                </g>
                <g class="outer-hex-spin">
                    <polygon points="110,10 196.6,160 23.4,160" fill="none" stroke="orange" stroke-width="1" />
                    <polygon points="110,210 23.4,60 196.6,60" fill="none" stroke="green" stroke-width="1" />
                </g>
            </svg>
            
            <p id="status-message">loading</p>
        </div>
        
    </div>
        </div>
    `;
    case PAGES.analysis: {
      const metadata = getData(state.activeDatasetName);
      const dataLength = metadata.data?.length || 0;
      console.log(allEntries, snoEntries, state);
      const latest = metadata.data[0];
      return `
            <div class="page">
            <h1>${metadata.cnName}统计</h1>
            <section class="latest-result">
    <h2>
      今期 👉🏻 第${latest.id}期
    </h2>
    <p data-schedule-date>
      <strong>时间 👉🏻</strong>
      ${new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }).format(new Date(latest.date))}
    </p>
    <div 
      class="result"
      data-result="${latest.no.join(",")},${latest.sno}"
    >
      <strong>今期结果</strong>
      <div class="balls">
        ${latest.no.map((x) => `<span class="ball">${x}</span>`).join("")}
        <span class="plus">+</span>
        <span class="ball special">
          ${latest.sno}
        </span>
      </div>
    </div>
  </section>     
            <h2 data-scheduled-date="${metadata.cnName}">下期时间👉🏻 <span>${getNextScheduledDate()}</span></h2>
            <p><a ${_a.data_highlight} id="page-switch" href="?page=datalist">过去结果</a></p>
                <div class="meta-info">数据总量👉🏻 ${metadata.data?.length || 0}期</div>
                <div class="controls-container">
        <!-- limit Group -->
        <div id="limit-form" class="button-group">
            <span>分析</span>
            ${[20, 30, 40, 50, 60]
              .map(
                (num) => `
                <button type="button" data-limit="${num}" 
                        class="${state.filters.limitCount === num ? "active" : "inactive"}">${num}</button>
            `,
              )
              .join("")}期
        </div>
        <div class="limit-range">        
            <span>分析以前数据</span>
         <button data-pos-vector="-1" type="button" class="icon-btn ${slicedData[slicedData.length - 1]?.id !== metadata.data[metadata.data.length - 1]?.id ? "active" : "inactive"}" id="previous-btn">
        <!-- A thicker, bolder arrow -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M16 5v14l-11-7z"/>
    </button>
    <div id="limit-range">${renderLimitedRangeText()}</div>
        <button data-pos-vector="1" type="button" class="icon-btn  ${slicedData[0]?.id !== metadata.data[0]?.id ? "active" : "inactive"}" id="next-btn">
        <!-- A thicker, bolder arrow -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M8 5v14l11-7z"/>
    </button>    
    <small data-meta-latest></small>
    </div>
        <!-- Sort Group -->
        <div id="sort-form" class="button-group">
            <span>排序</span>
            <button type="button" data-sort="reversed" class="active">${renderReverseBtnText()}</button>
            <button type="button" data-sort="sortByNumber" class="${state.filters.orderBy === "number" ? "active" : "inactive"}">按号码</button>
            <button type="button" data-sort="sortByCount" class="${state.filters.orderBy === "count" ? "active" : "inactive"}">按次数</button>
        </div>
    </div>    
                      <h1>特</h1>
                  <div class="grid-container" data-analysis="sno" >${renderDataAnalysis(snoEntries)}
                </div>
                      <h1>平特</h1>
                      <div class="grid-container" data-analysis="all" >${renderDataAnalysis(allEntries)}
                </div>
            </div>
        `;
    }
    case PAGES.datalist:
      return `
            <div class="page">
                <h1>${getData(state.activeDatasetName).cnName}過去攪珠結果</h1>
                <a id="page-switch" href="?page=analysis">数据统计</a>
                <div class="meta-info">数据总量：${getData(state.activeDatasetName).data?.length || 0}</div>
                <div id="result-list">
                    ${getData(state.activeDatasetName)
                      .data.map(
                        (item, index) => `
                        <div class="result-row">
                          <div style='flex:1;'>${index + 1}.</div>
                          <div style='flex:3;'>${item.id}</div>
                          <div style='flex:5;'>${item.date}</div>
                          <div style='flex:10;'>${item.no.map((n) => `<span>${n}</span>`).join("")}</div>
                          <div style='flex:1;'>${item.sno}</div>
                        </div>`,
                      )
                      .join("")}
                </div>
                
            </div>
        `;
    default:
      return null;
  }
}

export function setupHighlight() {
  document.querySelectorAll("a, button").forEach((el) => {
    el.setAttribute(_a.data_highlight, "");
   
  });
}
