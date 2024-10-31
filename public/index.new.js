// Virtual scrolling configuration
const MAX_ATTR = 20;
const ROW_HEIGHT = 22; // Height of each log line in pixels

let last = 0;
let appState = null;
let rawData = [];
let filteredData = [];
let fuzzyData = [];
let entrypoint = document.getElementById('stuff');

// Virtual scrolling state
let visibleRows = [];
let scrollTop = 0;
let containerHeight = 0;
let totalHeight = 0;
let visibleStartIndex = 0;
let visibleEndIndex = 0;
let isDraggingScrollbar = false;
let lastY = 0;

let sidenav = document.getElementById('attributes');
let fuzzy = document.getElementById('searchinput');
let fuzzyVal = "";
let attrRows = [];

// Create virtual scroll container
const virtualScrollContainer = document.createElement('div');
virtualScrollContainer.className = 'virtual-scroll-container';

const virtualScrollContent = document.createElement('div');
virtualScrollContent.className = 'virtual-scroll-content';

const virtualScrollbar = document.createElement('div');
virtualScrollbar.className = 'virtual-scrollbar';

const scrollbarThumb = document.createElement('div');
scrollbarThumb.className = 'virtual-scrollbar-thumb';

virtualScrollbar.appendChild(scrollbarThumb);
virtualScrollContainer.appendChild(virtualScrollContent);
virtualScrollContainer.appendChild(virtualScrollbar);
entrypoint.appendChild(virtualScrollContainer);

let attributes = {
  filename: {}
};

let filters = new Map();

const reservedNames = [
  'message',
  'timestamp',
  'filename',
];

function initScrollHandlers() {
  virtualScrollContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    scrollTop = Math.max(0, Math.min(scrollTop + e.deltaY, totalHeight - containerHeight));
    updateScroll();
  });

  scrollbarThumb.addEventListener('mousedown', (e) => {
    isDraggingScrollbar = true;
    lastY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingScrollbar) return;
    const delta = e.clientY - lastY;
    const scrollRatio = delta / (containerHeight - scrollbarThumb.offsetHeight);
    scrollTop = Math.max(0, Math.min(scrollTop + scrollRatio * totalHeight, totalHeight - containerHeight));
    lastY = e.clientY;
    updateScroll();
  });

  window.addEventListener('mouseup', () => {
    isDraggingScrollbar = false;
  });

  // Update container height on resize
  new ResizeObserver(() => {
    containerHeight = virtualScrollContainer.offsetHeight;
    updateScroll();
  }).observe(virtualScrollContainer);
}

function updateScroll() {
  const scrollRatio = scrollTop / (totalHeight - containerHeight);
  const thumbHeight = Math.max(30, (containerHeight / totalHeight) * containerHeight);
  const thumbTop = scrollRatio * (containerHeight - thumbHeight);
  
  scrollbarThumb.style.height = `${thumbHeight}px`;
  scrollbarThumb.style.top = `${thumbTop}px`;
  
  visibleStartIndex = Math.floor(scrollTop / ROW_HEIGHT);
  visibleEndIndex = Math.min(
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT),
    fuzzyData.length
  );
  
  renderVisibleRows();
}

function renderVisibleRows() {
  // Clear existing rows
  virtualScrollContent.innerHTML = '';
  
  // Update content height
  virtualScrollContent.style.height = `${totalHeight}px`;
  virtualScrollContent.style.transform = `translateY(${scrollTop}px)`;
  
  // Render only visible rows
  for (let i = visibleStartIndex; i < visibleEndIndex; i++) {
    const datum = fuzzyData[i];
    const row = createLogRow(datum);
    row.style.position = 'absolute';
    row.style.top = `${i * ROW_HEIGHT}px`;
    virtualScrollContent.appendChild(row);
  }
}

function createLogRow(datum) {
  const div = document.createElement('div');
  div.classList.add('message-line');
  
  const toggle = document.createElement('button');
  const toggleText = document.createTextNode('show');
  toggle.classList.add('toggle', 'toggle-hide');
  toggle.appendChild(toggleText);
  
  const filename = document.createElement('span');
  filename.textContent = `${datum.filename}: `;
  
  const sev = document.createElement('span');
  sev.textContent = datum.severity;
  sev.className = `severity-${datum.severity.toLowerCase()}`;
  
  const timestamp = document.createElement('span');
  timestamp.textContent = `${datum.timestamp.substring(0,23)}: `;
  
  const message = document.createElement('span');
  message.textContent = datum.message;
  
  div.append(toggle, filename, sev, timestamp, message);
  
  // Add data attributes
  Object.entries(datum).forEach(([key, val]) => {
    if (!reservedNames.includes(key)) {
      const keySanitized = key.replace(/[^a-zA-Z\-]/g, '-');
      div.setAttribute(`data-${keySanitized}`, val);
    }
  });
  
  // Add toggle functionality
  toggle.onclick = createToggleHandler(div, toggle);
  
  return div;
}

function createToggleHandler(div, toggle) {
  return (e) => {
    e.target.disabled = true;
    setTimeout(() => {e.target.disabled = false}, 200);
    
    const isOpen = div.classList.contains('selected');
    if (!isOpen) {
      div.classList.add('selected');
      const dataAttrs = div.getAttributeNames().filter((attr) => attr.startsWith('data-'));
      dataAttrs.forEach((attr) => {
        toggle.childNodes[0].nodeValue = 'hide';
        const elem = document.createElement('div');
        const text = document.createTextNode(`${attr.substring(5)}: ${div.getAttribute(attr)}`);
        elem.replaceChildren(text);
        elem.classList.add('message-details');
        div.appendChild(elem);
      });
    } else {
      toggle.childNodes[0].nodeValue = 'show';
      div.classList.remove('selected');
      const children = Array.from(div.children);
      children.slice(5).forEach(child => div.removeChild(child));
    }
  };
}

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
      accumUniqueAttrs(content, file);
      rawData[last] = { filename: file, ...content };
      last += 1;
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
  totalHeight = fuzzyData.length * ROW_HEIGHT;
  updateScroll();
  renderSidenav();
}

// Initialize sidenav rows
for(let i = 0; i < MAX_ATTR; i++) {
  const div = document.createElement('div');
  sidenav.append(div);
  attrRows.push(div);
}

// Initialize scroll handlers
initScrollHandlers();

// Setup WebSocket connection
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
    console.error('Got message before ready');
  }
}
