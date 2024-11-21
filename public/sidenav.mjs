import { defaultAttrs, MAX_ATTR } from "./constants.mjs";
import { rawData, updateFuzzyData, render } from "./render.mjs";
import { resetScroll, updateScrollThumb } from "./scrollbar.mjs";

let sidenav = document.getElementById("attributes");
let fuzzy = document.getElementById("searchinput");

let filteredData = [];

let fuzzyVal = "";
let attrRows = [];

// {
//   attrName: {
//     attr1: {
//       count: number,
//       filter: bool,
//     }
//   }
// }
let attributes = {
  filename: {},
};

let filters = new Map();

fuzzy.oninput = (e) => {
  fuzzyVal = e.target.value;
  render();
};

// We only really care about these on load.
const liveSearchParams = Array.from(
  new URLSearchParams(window.location.search).entries(),
).reduce((acc, val) => {
  acc[val[0]] = val[1].split(",");
  return acc;
}, {});

// A bit of a hack to only have the
// filter-from-searchparam code run on the initial file loads.
let paramsLoaded = false;
setTimeout(() => {
  paramsLoaded = true;
  renderSidenav();
}, 500);

export function isPinnedAttr(attrName) {
  return Object.keys(attributes).includes(attrName);
}

export function pinNewAttr(datum, attrName) {
  if (!(attrName in datum)) {
    return;
  }

  const key = attrName;
  const val = datum[attrName];
  if (!(key in attributes)) {
    attributes[key] = {};
  }
  if (val in attributes[key]) {
    attributes[key][val]["count"] += 1;
  } else {
    attributes[key][val] = {};
    attributes[key][val]["count"] = 1;
  }
}

export function setupDefaultAttrs(structuredLog) {
  for (const key in structuredLog) {
    if (!defaultAttrs.includes(key)) {
      continue;
    }

    const val = structuredLog[key];
    if (!(key in attributes)) {
      attributes[key] = {};
    }
    if (val in attributes[key]) {
      attributes[key][val]["count"] += 1;
    } else {
      attributes[key][val] = {};
      attributes[key][val]["count"] = 1;
    }
  }
}

function sortByTimestamp(a, b) {
  if (a.timestamp < b.timestamp) {
    return -1;
  } else {
    return 1;
  }
}

// TODO: refactor, it's slow
export function filter() {
  // Every attribute in a group filter is an OR.
  // Every different attribute group is an AND.
  // Semi-messy strategy:
  //   For every attribute group filter, collect lists that fit the filter.
  //   At the end, merge the lists and use that as the base list for the next filter.
  //   Unfortunately, we need to sort by timestamp at the end again.
  //   There's probably a better strategy.
  let inter = rawData;
  let merge = [];
  filters.forEach((attrVals, attrName) => {
    merge = [];
    attrVals.forEach((attrVal) => {
      merge.push(inter.filter((dat) => dat.line[attrName] === attrVal));
    });
    inter = merge.flat();
  });
  merge = merge.flat().sort(sortByTimestamp);
  filteredData = filters.size > 0 ? merge : rawData;

  updateFuzzyData(
    fuzzyVal
      ? filteredData.filter((data) => {
          // If the filter input is all lowercase, assume case insensitivity.
          // Otherwise, match exactly.
          if (fuzzyVal.toLowerCase() === fuzzyVal) {
            return data.line.message.toLowerCase().includes(fuzzyVal);
          } else {
            return data.line.message.includes(fuzzyVal);
          }
        })
      : filteredData,
  );
}

function sortByName(a, b) {
  if (a[0] < b[0]) {
    return -1;
  } else {
    return 1;
  }
}

export function renderSidenav() {
  Object.entries(attributes).forEach(([attrName, values], i) => {
    attrRows[i].replaceChildren();

    const div = document.createElement("div");
    const text = document.createTextNode(attrName);
    div.classList.add("attribute-header");
    div.append(text);
    attrRows[i].append(div);
    Object.entries(values)
      .sort(sortByName)
      .forEach(([valName, val]) => {
        const attrValue = document.createElement("button");
        const attrInSearchParam =
          attrName in liveSearchParams &&
          liveSearchParams[attrName].includes(valName);
        if ("meta" in val && val["meta"] == true) {
          attrValue.setAttribute("data-meta", val["meta"]);
          attrValue.classList.add("selected");
        }

        if (!paramsLoaded && attrInSearchParam) {
          attrValue.setAttribute("data-meta", true);
          val["meta"] = true;
          attrValue.classList.add("selected");
          if (filters.has(attrName)) {
            // This needs to be de-duped because as new files get loaded into the app,
            // this filter call gets redundantly called for every file.
            filters.set(
              attrName,
              Array.from(new Set([...filters.get(attrName), valName])),
            );
          } else {
            filters.set(attrName, [valName]);
          }
        }

        const attrValueText = document.createTextNode(`${valName}: ${val.count}`);
        attrValue.classList.add("attribute-item");
        attrValue.append(attrValueText);
        attrValue.disabled = !paramsLoaded;
        attrValue.onclick = (e) => {
          if ("meta" in val) {
            val["meta"] = !val["meta"];
          } else {
            val["meta"] = true;
          }

          const filterKey = valName;
          const searchparams = new URLSearchParams(window.location.search);
          if (val["meta"]) {
            if (filters.has(attrName)) {
              filters.set(
                attrName,
                Array.from(new Set([...filters.get(attrName), valName])),
              );
              searchparams.set(attrName, filters.get(attrName));
            } else {
              filters.set(attrName, [filterKey]);
              searchparams.set(attrName, [filterKey]);
            }
          } else if (filters.has(attrName)) {
            if (filters.get(attrName).length === 1) {
              filters.delete(attrName);
              searchparams.delete(attrName);
            } else {
              filters.set(
                attrName,
                filters.get(attrName).filter((key) => key !== filterKey),
              );
              searchparams.set(attrName, filters.get(attrName));
            }
          }
          window.history.replaceState(
            null,
            null,
            `?${searchparams.toString()}`,
          );

          // Go back to top on filters.
          resetScroll();

          renderSidenav();
          render();
          updateScrollThumb();
        };
        attrRows[i].append(attrValue);
      });
  });
  updateScrollThumb();
}

export function bootstrapSidenav() {
  for (let i = 0; i < MAX_ATTR; i++) {
    const div = document.createElement("div");
    sidenav.append(div);
    div.classList.add('attribute-collection');
    attrRows.push(div);
  }
}
