const MAX_ATTR = 20;
const MAX_LINES = 5000;
const MAX_DATA = 20_000;

let last = -1;
let appState = null;
let rows = [];
let data = [];
let entrypoint = document.getElementById('stuff');

let sidenav = document.getElementById('attributes');
let attrRows = [];
let attributes = {
  filename: {}
};

const fuse = new Fuse();

reservedNames = [
  'message',
  'timestamp',
];

function accumUniqueAttrs(structuredLog, filename) {
  for (const key in structuredLog) {
    if (reservedNames.includes(key)) {
      continue;
    }
    val = structuredLog[key];
    if (!(key in attributes)) {
      attributes[key] = {};
    }
    if (val in attributes[key]) {
      attributes[key][val] += 1;
    } else {
      attributes[key][val] = 1 ;
    }
  }
  if (!(filename in attributes['filename'])) {
    attributes['filename'][filename] = 1
  } else {
    attributes['filename'][filename] += 1
  }
}

function filterData() {
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
        for (let i=0; i < MAX_DATA-1; i++) {
          data[i] = data[i+1];
        }
      } else {
        last += 1;
      }
      data[last] = line;
    });
  }); 
}

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
      const text = document.createTextNode(`${valName}: ${val}`);
      div.classList.add('attribute-item')
      div.append(text);
      attrRows[i].append(div);
    });
  });
}

function render() {
  const offset = last > MAX_LINES ? last - MAX_LINES : 0;
  const cap = Math.min(MAX_LINES, last);
  for (let i=0; i<cap; i++) {
      rows[i].nodeValue = `${data[i+offset].timestamp} ${data[i+offset].filename}: ${data[i+offset].message}`;
  }
}

for(let i = 0; i < MAX_LINES; i++) {
  const div = document.createElement('div');
  const text = document.createTextNode('');
  div.replaceChildren(text);
  // div.onclick = () => { alert('blah'); };
  entrypoint.append(div);
  rows.push(text);
}

for(let i = 0; i < MAX_ATTR; i++) {
  const div = document.createElement('div');
  div.onclick = () => { 
    render();
  };
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
    renderSidenav();
  } else if (event.data === 'hello') {
    appState = "ready";
  } else {
    logger.error('Got message before ready');
  }
}
