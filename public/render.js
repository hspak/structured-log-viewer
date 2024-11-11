import { reservedNames, HEIGHT_OFFSET } from './constants.js';
import { setupDefaultAttrs,filter, renderSidenav } from './sidenav.js';
import { updateScrollThumb } from './scrollbar.js';

export let container = document.getElementById('stuff');
export let viewportRows = [];
export let viewportOffset = 0;

export let fuzzyData = [];
export let rawData = [];

let rawDataLength = 0;

export function populate(msgs) {
  msgs.forEach((msg) => {
    const file = msg.filename;
    msg.contents.forEach((content) => {
      let lines = [];

      setupDefaultAttrs(content, file);
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
  renderSidenav();
}

export function updateFuzzyData(updatedData) {
  fuzzyData = updatedData;
}

export function updateViewportOffset(offset) {
  viewportOffset = offset;
}

export function render(clearToggles) {
  filter();

  // TODO: This is a bit of a cop out because I don't have a good solution to
  // keep track of the toggle state per-row. Keep track of toggle state on fuzzyData.
  document.querySelectorAll('.message-details').forEach(e => e.remove());

  const maxRender = Math.min(viewportRows.length, Math.max(0, fuzzyData.length - viewportOffset));

  for (let i=0; i<maxRender; i++) {
    const datum = fuzzyData[i + viewportOffset];

    if (clearToggles && viewportRows[i].classList.contains('selected')) {
      viewportRows[i].classList.remove('selected');
      viewportRows[i].childNodes[0].childNodes[0].nodeValue = 'show';
      continue;
    }

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

  updateScrollThumb();
}

export function bootstrapRows() {
  while (true) {
    initDomRow();
    if ((container.clientHeight) > (container.parentElement.clientHeight - HEIGHT_OFFSET)) {
      break;
    }
  }
}

export function setupResizeListener() {
  addEventListener("resize", () => {
    const maxHeight = container.parentElement.clientHeight - HEIGHT_OFFSET;
    while (container.clientHeight < maxHeight) {
      initDomRow();
    }
    while (container.clientHeight >= maxHeight) {
      viewportRows.pop().remove();
    }

    updateScrollThumb();
    render();
  });
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
    const line = e.target.parentNode;
    const isOpen = div.classList.contains('selected');
    if (!isOpen) {
      div.classList.add('selected');
      const dataAttrs = line.getAttributeNames().filter((attr) => attr.startsWith('data-'));
      dataAttrs.forEach((attr) => {
        // TODO: add button to pin attribute dynamically
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
