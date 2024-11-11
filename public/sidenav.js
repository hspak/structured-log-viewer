import { defaultAttrs, reservedNames, MAX_ATTR } from './constants.js';
import { rawData, updateFuzzyData, render } from './render.js';
import { resetScroll } from './scrollbar.js';

let sidenav = document.getElementById('attributes');
let fuzzy = document.getElementById('searchinput');

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
  filename: {}
};

let filters = new Map();

fuzzy.oninput = (e) => {
  fuzzyVal = e.target.value;
  render();
};

export function setupDefaultAttrs(structuredLog, filename) {
  for (const key in structuredLog) {
    if (!defaultAttrs.includes(key)) {
      continue;
    }

    const val = structuredLog[key];
    if (!(key in attributes)) {
      attributes[key] = {};
    }
    if (val in attributes[key]) {
      attributes[key][val]['count'] += 1;
    } else {
      attributes[key][val] = {};
      attributes[key][val]['count'] = 1;
    }
  }
  if (!(filename in attributes['filename'])) {
    attributes['filename'][filename] = {}
    attributes['filename'][filename]['count'] = 1
  } else {
    attributes['filename'][filename]['count'] += 1
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
      merge.push(inter.filter((dat) => dat[attrName] === attrVal));
    });
    inter = merge.flat();
  });
  merge = merge.flat().sort(sortByTimestamp);
  filteredData = merge.length > 0 ? merge : rawData;

  updateFuzzyData(fuzzyVal ? filteredData.filter((data) => {
    // If the filter input is all lowercase, assume case insensitivity.
    // Otherwise, match exactly.
    if (fuzzyVal.toLowerCase() === fuzzyVal) {
      return data.message.toLowerCase().includes(fuzzyVal);
    } else {
      return data.message.includes(fuzzyVal);
    }
  }) : filteredData);
}

export function renderSidenav() {
  Object.entries(attributes).forEach(([attrName, values], i) => {
    attrRows[i].replaceChildren();

    const div = document.createElement('div');
    const text = document.createTextNode(attrName);
    div.classList.add('attribute-header');
    div.append(text);
    attrRows[i].append(div);
    Object.entries(values).forEach(([valName, val]) => {
      const div = document.createElement('div');
      if ('meta' in val && val['meta'] == true) {
        div.setAttribute("data-meta", val['meta']);
        div.classList.add('selected')
      }
      const text = document.createTextNode(`${valName}: ${val.count}`);
      div.classList.add('attribute-item')
      div.append(text);
      div.onclick = (_) => {
        if ('meta' in val) {
          val['meta'] = !val['meta'];
        } else {
          val['meta'] = true;
        }

        const filterKey = valName;
        if (val['meta']) {
          if (filters.has(attrName)) {
            filters.set(attrName, [...filters.get(attrName), filterKey]);
          } else {
            filters.set(attrName, [filterKey]);
          }
        } else if (filters.has(attrName)) {
          if (filters.get(attrName).length === 1) {
            filters.delete(attrName);
          } else {
            filters.set(attrName, filters.get(attrName).filter((key) => key !== filterKey));
          }
        }

        // Go back to top on filters.
        resetScroll();

        renderSidenav();
        render();
      };
      attrRows[i].append(div);
    });
  });
}

export function bootstrapSidenav() {
  for(let i = 0; i < MAX_ATTR; i++) {
    const div = document.createElement('div');
    sidenav.append(div);
    attrRows.push(div);
  }
}
