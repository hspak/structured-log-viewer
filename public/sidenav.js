const MAX_ATTR = 20;

let sidenav = document.getElementById('attributes');
let fuzzy = document.getElementById('searchinput');

let filteredData = [];
let fuzzyData = [];

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

const reservedNames = [
  'message',
  'timestamp',
  'filename',
];

fuzzy.oninput = (e) => {
  fuzzyVal = e.target.value;
  render();
};

function accumUniqueAttrs(structuredLog, filename) {
  for (const key in structuredLog) {
    if (reservedNames.includes(key)) {
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

// TODO: refactor, it's slow
function filter() {
  let inter = [];
  filters.forEach((attrVal, attrName) => {
    inter = rawData.filter((dat) => dat[attrName] === attrVal);
  });
  filteredData = inter.length > 0 ? inter : rawData;
  fuzzyData = fuzzyVal ? filteredData.filter((data) => data.message.toLowerCase().includes(fuzzyVal)) : filteredData;
}
 
function renderSidenav() {
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
        div.setAttribute("data-test", val['meta']);
        div.classList.add('selected')
      }
      const text = document.createTextNode(`${valName}: ${val.count}`);
      div.classList.add('attribute-item')
      div.append(text);
      div.onclick = (e) => {
        e.target.disabled = true;
        setTimeout(() => {e.target.disabled = false}, 200);

        if ('meta' in val) {
          val['meta'] = !val['meta'];
        } else {
          val['meta'] = true;
        }

        const filterKey = valName;
        if (val['meta']) {
          filters.set(attrName, filterKey);
        } else if (filters.has(attrName)) {
          filters.delete(attrName, filterKey);
        }

        // Go back to top on filters.
        resetScroll();

        render();
      };
      attrRows[i].append(div);
    });
  });
}

for(let i = 0; i < MAX_ATTR; i++) {
  const div = document.createElement('div');
  sidenav.append(div);
  attrRows.push(div);
}