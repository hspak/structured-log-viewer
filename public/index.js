const MAX_ATTR = 20;
const MAX_LINES = 5000;
const MAX_DATA = 100_000;

let last = -1;
let appState = null;
let rows = [];
let data = [];
let filteredData = [];
let entrypoint = document.getElementById('stuff');

let sidenav = document.getElementById('attributes');
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

let filters = [];


const reservedNames = [
  'message',
  'timestamp',
];

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
  const inter = [];
  for (let i = 0; i < filters.length; i++) {
    inter.push(data.filter((dat) => {
      const val = filters[i].split(':')
      const attrName = val[0];
      const attrVal = val[1];
      return dat[attrName] === attrVal;
    }));
  }
  filteredData = inter.flat();
}
 

function populate(msg) {
  msg.forEach((blob) => {
    const file = blob.filename;
    let lines = [];

    const logLines = blob.content.split('\n').map(line => line.trim()).filter(line => line !== '');
    logLines.forEach((logLine) => {
      // TODO: Maybe ensure all log lines conform from server side.
      try {
        const structuredLog = JSON.parse(logLine);
        accumUniqueAttrs(structuredLog, file);
        lines.push({
          filename: file,
          ...structuredLog,
        });
      } catch (e) {
        console.error(e)
        lines.push({
          filename: file, 
          message: logLine,
          timestamp: '???',
        });
      }
    });

    lines.forEach((line) => {
      if (last === MAX_DATA-1) {
        // TODO: this is probably slow
        for (let i=0; i < MAX_DATA-1; i++) {
          data[i] = data[i+1];
        }
      } else {
        last += 1;
      }
      data[last] = line;
    });
  }); 

  filter();
}

const options = {
  keys: ['message', 'filename'],
};
const fuse = new Fuse(data);

function renderSidenav() {
  Object.entries(attributes).forEach(([attrName, values], i) => {
    attrRows[i].replaceChildren();

    const div = document.createElement('div');
    const text = document.createTextNode(attrName);
    div.classList.add('attribute-header')
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
          filters.push(`${attrName}:${filterKey}`);
        } else {
          filters = filters.filter(item => !item.endsWith(filterKey));
        }

        filter();
        render();
      };
      attrRows[i].append(div);
    });
  });
}

function render() {
  if (filters.length > 0) {
    const len = filteredData.length;
    const offset = len > MAX_LINES ? len - MAX_LINES : 0;
    const cap = Math.min(MAX_LINES, len);
    for (let i=0; i<cap; i++) {
        rows[i].nodeValue = `${filteredData[i+offset].timestamp} ${filteredData[i+offset].filename}: ${filteredData[i+offset].message}`;
    } 

    // Clear
    const fullCap = Math.min(MAX_LINES, last);
    for (let i=len; i<fullCap; i++) {
        rows[i].nodeValue = ``;
    } 
  } else {
    const offset = last > MAX_LINES ? last - MAX_LINES : 0;
    const cap = Math.min(MAX_LINES, last);
    for (let i=0; i<cap; i++) {
        rows[i].nodeValue = `${data[i+offset].timestamp} ${data[i+offset].filename}: ${data[i+offset].message}`;
    }
  }
  renderSidenav();
}

for(let i = 0; i < MAX_LINES; i++) {
  const div = document.createElement('div');
  const text = document.createTextNode('');
  div.replaceChildren(text);
  entrypoint.append(div);
  rows.push(text);
}

for(let i = 0; i < MAX_ATTR; i++) {
  const div = document.createElement('div');
  sidenav.append(div);
  attrRows.push(div);
}

const socket = new WebSocket('ws://localhost:8000/socket');
socket.onopen = () => socket.send('ready');
socket.onmessage = (event) => {
  if (appState) {
    const d = JSON.parse(event.data);
    data.push(d)
    populate(d);
    render();
  } else if (event.data === 'hello') {
    appState = "ready";
  } else {
    logger.error('Got message before ready');
  }
}
