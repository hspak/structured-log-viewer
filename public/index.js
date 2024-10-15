const MAX_ATTR = 20;
const MAX_LINES = 5000;

let last = 0;
let appState = null;
let rows = [];
let rawData = [];
let filteredData = [];
let fuzzyData = [];
let entrypoint = document.getElementById('stuff');

let sidenav = document.getElementById('attributes');
let fuzzy = document.getElementById('searchinput');
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

// TODO: ideally we can filter OR for values within the same attribute, but
// AND for across attributes.
function filter() {
  let inter = [];
  filters.forEach((attrVal, attrName) => {
    inter = rawData.filter((dat) => dat[attrName] === attrVal);
  });
  filteredData = inter.length > 0 ? inter : rawData;
  fuzzyData = fuzzyVal ? filteredData.filter((data) => data.message.toLowerCase().includes(fuzzyVal)) : filteredData;
}

function populate(msgs) {
  msgs.forEach((msg) => {
    const file = msg.filename;
    msg.contents.forEach((content) => {
      let lines = [];

      accumUniqueAttrs(content, file);
      lines.push({
        filename: file,
        ...content,
      });

      // TODO: find some fallback if we exceed MAX_DATA
      lines.forEach((line) => {
        rawData[last] = line;
        last += 1;
      });
    });
  });
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
      div.onclick = () => {
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
        render();
      };
      attrRows[i].append(div);
    });
  });
}

function render() {
  filter();

  const offset = last > MAX_LINES && fuzzyData.length === rawData.length ? last - MAX_LINES : 0;
  const cap = Math.min(MAX_LINES, last, fuzzyData.length);
  for (let i=0; i<cap; i++) {
      rows[i].nodeValue = `${fuzzyData[i+offset].filename}: ${fuzzyData[i+offset].severity} ${fuzzyData[i+offset].timestamp}: ${fuzzyData[i+offset].message}`;
      Object.entries(fuzzyData[i+offset]).forEach(([key, val]) => {
        if (!reservedNames.includes(key)) {
          const keySanitized = key.replace(/[^a-zA-Z\-]/g, '-');
          rows[i].parentNode.setAttribute(`data-${keySanitized}`, val);
          rows[i].parentNode.childNodes[0].classList.remove('toggle-hide');
        }
      });
  }

  // Clear
  const fullCap = Math.min(MAX_LINES, last);
  for (let i=cap; i<fullCap; i++) {
      rows[i].nodeValue = ``;
      rows[i].parentNode.childNodes[0].classList.add('toggle-hide');
  }
  renderSidenav();
}

for(let i = 0; i < MAX_LINES; i++) {
  const div = document.createElement('div');
  const text = document.createTextNode('');

  const toggle = document.createElement('button');
  const toggleText = document.createTextNode('show');
  toggle.classList.add('toggle');
  toggle.appendChild(toggleText);
  div.append(toggle, text);

  div.classList.add('message-line');
  toggle.onclick = (e) => {
    const line = e.target.parentNode;
    const isOpen = div.classList.contains('selected');
    if (!isOpen) {
      div.classList.add('selected');
      const dataAttrs = line.getAttributeNames().filter((attr) => attr.startsWith('data-'));
      dataAttrs.forEach((attr) => {
        e.target.childNodes[0].nodeValue = 'hide';
        const elem = document.createElement('div');
        const text = document.createTextNode(`${attr.substring(5)}: ${line.getAttribute(attr)}`);
        elem.replaceChildren(text);
        elem.classList.add('message-details');
        div.appendChild(elem);
      });
    } else {
      e.target.childNodes[0].nodeValue = 'show';
      div.classList.remove('selected');
      div.replaceChildren(toggle, text);
    }
  };
  entrypoint.append(div);
  rows.push(text);
}

for(let i = 0; i < MAX_ATTR; i++) {
  const div = document.createElement('div');
  sidenav.append(div);
  attrRows.push(div);
}

const socket = new WebSocket('ws://localhost:8080/socket');
socket.onopen = () => socket.send('ready');
socket.onmessage = (event) => {
  if (appState) {
    const d = JSON.parse(event.data);
    populate(d);
    render();
  } else if (event.data === 'hello') {
    appState = "ready";
  } else {
    logger.error('Got message before ready');
  }
}
