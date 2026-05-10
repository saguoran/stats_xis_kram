import { DrawResult } from "./state.js";
export let snoEntries = [];
export let allEntries = [];
export let slicedData = [];

/**
 * Reorders and slice the dataset, set these variables
 * @type {typeof slicedData}
 * @type {typeof snoEntries}
 * @type {typeof allEntries}
 * @param {DrawResult[]} data - The full array of results
 * @param {number} start - The starting index 0
 * @param {number} end - The ending index data.length
 */
export function setAnalysisData(data, start, end) {
  slicedData = data.slice(start, end);
  // console.log(slicedData);
  const snoObj = {};
  const allObj = {};
  for (const item of slicedData) {
    item.sno = item.sno;
    snoObj[item.sno] = (snoObj[item.sno] || 0) + 1;
    allObj[item.sno] = (allObj[item.sno] || 0) + 1;
    for (let n of item.no) {
      n = n;
      allObj[n] = (allObj[n] || 0) + 1;
    }
  }  
    // ensure keys 1..49 exist and sort numerically
  const makeEntries = (obj) => {
    for (let i = 1; i <= 49; i++) if (!(i in obj)) obj[i] = 0;
    return Object.keys(obj).reduce((acc, a, b) => {
      acc.push([a, obj[a]]);
      return acc;
    }, []);
  };
  snoEntries = makeEntries(snoObj);
  allEntries = makeEntries(allObj);
  // console.log("SNO:", snoObj);
  // console.log("SNO counts:", snoEntries);
  // console.log("All counts:", allEntries);
  return { snoEntries, allEntries };
}

export function sortByNumber(entries, reversed = false) {
  entries.sort((a, b) => (a[0] - b[0])*(reversed ? -1 : 1));
}
export function sortByCount(entries, reversed = false) {
  entries.sort((a, b) => (a[1] - b[1])*(reversed ? -1 : 1) || (a[0] - b[0]));
}

/** 
 * Calculate new offset range. Returns null if move is invalid to prevent script crashes.
 * @param {number} actionVector - The step to move (e.g., -1 or +1)
 * @param {number} currentIndex - Current starting index
 * @param {number} limit - How many items to show
 * @param {number} total - Total records in dataset
 * @returns {[number, number]|null}
 */
export function updateDataOffset(actionVector, currentIndex, limit, total) {
    const newStart = currentIndex + actionVector;
    const newEnd = newStart + limit;

    // Check if we are going out of bounds
    if (newStart < 0 || newStart >= total) {
        console.warn(`Pagination out of bounds: ${newStart}, will use the old offset instead`);
        return [currentIndex, limit+currentIndex]; 
    }

    // "Clamp" the end so it doesn't exceed the total count
    const actualEnd = Math.min(newEnd, total);

    return [newStart, actualEnd];
}