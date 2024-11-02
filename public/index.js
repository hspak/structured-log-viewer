const MAX_ATTR = 20;
const HEIGHT_OFFSET = 8 + 8 + 21.602 + 10.39;

let appState = null;

let viewportRows = [];
let viewportOffset = 0;

let rawDataLength = 0;
let rawData = [];
let filteredData = [];
let fuzzyData = [];

let container = document.getElementById('stuff');
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

      lines.forEach((line) => {
        rawData[rawDataLength] = line;
        rawDataLength += 1;
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
        render();
      };
      attrRows[i].append(div);
    });
  });
}

function render() {
  filter();

  const maxRender = Math.min(viewportRows.length, Math.max(0, fuzzyData.length - viewportOffset));
  console.log('offset', viewportOffset, 'max', maxRender);
  for (let i=0; i<maxRender; i++) {
    const datum = fuzzyData[i + viewportOffset];
    viewportRows[i].childNodes[1].childNodes[0].nodeValue = `${datum.filename}: `;
    viewportRows[i].childNodes[2].childNodes[0].nodeValue = datum.severity;
    viewportRows[i].childNodes[3].childNodes[0].nodeValue = `${datum.timestamp.substring(0,23)}: `;
    viewportRows[i].childNodes[4].childNodes[0].nodeValue = datum.message;

    if (datum.severity === 'DEBUG') {
      viewportRows[i].childNodes[2].className = 'severity-debug';
    } else if (datum.severity === 'WARNING') {
      viewportRows[i].childNodes[2].className = 'severity-warning';
    } else if (datum.severity === 'ERROR') {
      viewportRows[i].childNodes[2].className = 'severity-error';
    } else {
      viewportRows[i].childNodes[2].className = 'severity-info';
    }

    Object.entries(datum).forEach(([key, val]) => {
      if (!reservedNames.includes(key)) {
        const keySanitized = key.replace(/[^a-zA-Z\-]/g, '-');
        viewportRows[i].setAttribute(`data-${keySanitized}`, val);
        viewportRows[i].classList.remove('hide');
      }
    });
  }

 for (let i=maxRender; i<viewportRows.length; i++) {
      viewportRows[i].classList.add('hide');
  }

  renderSidenav();
}

function initDomRow() {
  const div = document.createElement('div');

  const toggle = document.createElement('button');
  const toggleText = document.createTextNode('show');
  toggle.classList.add('toggle', 'toggle-hide');
  toggle.appendChild(toggleText);

  const filename = document.createElement('span');
  const filenameText = document.createTextNode('');
  filename.appendChild(filenameText);

  const sev = document.createElement('span');
  const sevText = document.createTextNode('');
  sev.appendChild(sevText);

  const timestamp = document.createElement('span');
  const timestampText = document.createTextNode('');
  timestamp.appendChild(timestampText);

  const message = document.createElement('span');
  const messageText = document.createTextNode('');
  message.appendChild(messageText);

  div.append(toggle, filename, sev, timestamp, message);

  div.classList.add('message-line');
  toggle.onclick = (e) => {
    e.target.disabled = true;
    setTimeout(() => {e.target.disabled = false}, 200);
    
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
      div.replaceChildren(toggle, filename, sev, timestamp, message);
    }
  };
  container.append(div);
  viewportRows.push(div); 
}

while (true) {
  initDomRow();
  if ((container.clientHeight) > (container.parentElement.clientHeight - HEIGHT_OFFSET)) {
    break;
  }
}

for(let i = 0; i < MAX_ATTR; i++) {
  const div = document.createElement('div');
  sidenav.append(div);
  attrRows.push(div);
}

addEventListener("resize", () => {
  const maxHeight = container.parentElement.clientHeight - HEIGHT_OFFSET;
  while (container.clientHeight < maxHeight) {
    initDomRow();
  }
  while (container.clientHeight >= maxHeight) {
    viewportRows.pop().remove();
  }

  render()
});

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
 
