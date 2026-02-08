console.log("script loaded");

const DATA_PATH = "../marksix_data/top100.json";
let data = [];

const el = (tag, props = {}, ...children) => {
  const e = document.createElement(tag);
  Object.assign(e, props);
  children.flat().forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
};

async function loadJSON() {
  const res = await fetch(DATA_PATH);
  data = await res.json();

  const table = el("table", { className: "number-table" },
    el("thead", {},
      el("tr", {},
        ["No.", "ID", "Date", "Numbers", "SNO"].map(t => el("th", {}, t))
      )
    ),
    el("tbody", {},
      data.map((item, i) => el("tr", {},
        el("td", {}, String(i + 1)),
        el("td", {}, item.id),
        el("td", {}, item.date),
        el("td", {}, item.no.join(", ")),
        el("td", {}, String(item.sno))
      ))
    )
  );

  const container = el("div", { className: "number-container" }, table);
  const target = document.querySelector("#data-section");
  target.appendChild(container);
}

function buildCountsTable(title, entries) {
  const ths = entries.map(([k]) => el("th", { style: "padding:6px;border:1px solid #ddd;background:#f7f7f7" }, String(k)));
  const tds = entries.map(([, v]) => el("td", { style: "padding:6px;border:1px solid #ddd;text-align:center" }, String(v)));
  return el("div", { style: "min-width:260px;max-width:100%" },
    el("h3", { style: "margin:0 0 8px 0" }, title),
    el("table", { style: "border-collapse:collapse;width:100%" },
      el("thead", {}, el("tr", {}, ths)),
      el("tbody", {}, el("tr", {}, tds))
    )
  );
}

function numbersCounter(count) {
  count = Number(count) || data.length;
  const slice = data.slice(0, count);

  const snoObj = {};
  const allObj = {};
  for (const item of slice) {
    snoObj[item.sno] = (snoObj[item.sno] || 0) + 1;
    allObj[item.sno] = (allObj[item.sno] || 0) + 1;
    for (const n of item.no) allObj[n] = (allObj[n] || 0) + 1;
  }

  // ensure keys 1..49 exist and sort numerically
  const makeEntries = obj => {
    for (let i = 1; i <= 49; i++) if (!(i in obj)) obj[i] = 0;
    return Object.entries(obj).sort((a, b) => Number(a[0]) - Number(b[0]));
  };

  const snoEntries = makeEntries(snoObj);
  const allEntries = makeEntries(allObj);

  const prev = document.querySelector("#counts-container");
  if (prev) prev.remove();

  const countsContainer = el("div", { id: "counts-container", style: "display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap" },
    buildCountsTable(`特近${count}期`, snoEntries),
    buildCountsTable(`平特近${count}期`, allEntries)
  );

  document.querySelector("#data-section").appendChild(countsContainer);
  console.log("SNO counts:", snoEntries);
  console.log("All counts:", allEntries);
}

async function main() {
  await loadJSON();
  numbersCounter(50);
}

main();
