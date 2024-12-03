import { HEIGHT_OFFSET, ROW_HEIGHT, SPILL_COUNT } from './constants.mjs';
import { isPinnedAttr, setupDefaultAttrs,filter, renderSidenav, pinNewAttr } from './sidenav.mjs';
import { updateScrollThumb } from './scrollbar.mjs';

export let container = document.getElementById('stuff');
export let totalCountElem = document.getElementById('total-count');
export let viewportRows = [];
export let viewportOffset = 0;
export let scrollOffset = 0;

export let fuzzyData = [];
export let rawData = [];

export let rawDataLength = 0;

let showFilename = true;
let toggleFilename = document.getElementById('hide-filename');
toggleFilename.onchange = () => {
  showFilename = !showFilename;
  render();
};
let showSeverity = true;
let toggleSeverity = document.getElementById('hide-severity');
toggleSeverity.onchange = () => {
  showSeverity = !showSeverity;
  render();
};
let showTimestamp = true;
let toggleTimestamp = document.getElementById('hide-timestamp');
toggleTimestamp.onchange = () => {
  showTimestamp = !showTimestamp;
  render();
};


export function populate(msgs) {
  msgs.forEach((msg) => {
    const file = msg.filename;
    msg.contents.forEach((content) => {
      let lines = [];

      // The row's structured fields are stored as div fields, which are forced lowercase.
      // The data we keep track of in `rawData` needs to match for things
      // like pinning attributes to work consistently.
      let keys = Object.keys(content);
      let normalizedContent = {}
      for (let i=0; i<keys.length; i++) {
        const key = keys[i];
        normalizedContent[key.toLowerCase().replaceAll(/[^a-z0-9]+/gi, '-')] = content[key];
      }
      normalizedContent.filename = file;

      setupDefaultAttrs(normalizedContent);
      lines.push(normalizedContent);

      lines.forEach((line) => {
        rawData[rawDataLength] = {
          line,
          selected: false,
        }
        rawDataLength += 1;
      });
    });
  const countStr = rawDataLength === fuzzyData.length
    ? `: ${rawDataLength} logs`
    : `: ${rawDataLength} logs (curr: ${fuzzyData.length})`;
  totalCountElem.childNodes[0].nodeValue = countStr;
  });
  renderSidenav();
}

export function updateFuzzyData(updatedData) {
  fuzzyData = updatedData;
}

export function updateViewportOffset(offset) {
  if (offset >= (fuzzyData.length - viewportRows.length + SPILL_COUNT + 2)) {
    viewportOffset = fuzzyData.length - viewportRows.length + SPILL_COUNT + 2;
    return;
  }

  if (offset > 0) {
    viewportOffset = offset;
  } else {
    viewportOffset = 0;
  }
}

export function updateScrollOffset(offset) {
  scrollOffset = offset;
}

export function render() {
  filter();

  const maxRender = Math.min(viewportRows.length, Math.max(0, fuzzyData.length - viewportOffset));
  console.log(viewportOffset);

  // TODO: revisit
  // const rowOffset = 0;

  for (let i=0; i<maxRender; i++) {
    const datum = fuzzyData[i + viewportOffset];

    // TODO: broken on scroll, all toggles show same data if expanded and scrolling
    if (!datum.selected && viewportRows[i].classList.contains('selected')) {
      viewportRows[i].classList.remove('selected');
      viewportRows[i].childNodes[0].childNodes[0].nodeValue = 'show';
      while (viewportRows[i].childNodes.length > 5) {
        viewportRows[i].removeChild(viewportRows[i].lastChild);
      }
    } else if (datum.selected && !viewportRows[i].classList.contains('selected')) {
      showDetails(viewportRows[i], viewportRows[i].childNodes[0].childNodes[0], i+viewportOffset);
    }


    // viewportRows[i].style.transform = `translateY(${-rowOffset}px)`;
    if (showFilename) {
      viewportRows[i].childNodes[1].childNodes[0].nodeValue = `${datum.line.filename}: `;
    } else {
      viewportRows[i].childNodes[1].childNodes[0].nodeValue = '';
    }

    if (showSeverity) {
      viewportRows[i].childNodes[2].childNodes[0].nodeValue = datum.line.severity;
      if (datum.line.severity === 'DEBUG') {
        viewportRows[i].childNodes[2].className = 'severity-debug';
      } else if (datum.line.severity === 'WARNING') {
        viewportRows[i].childNodes[2].className = 'severity-warning';
      } else if (datum.line.severity === 'ERROR') {
        viewportRows[i].childNodes[2].className = 'severity-error';
      } else {
        viewportRows[i].childNodes[2].className = 'severity-info';
      }
    } else {
      viewportRows[i].childNodes[2].childNodes[0].nodeValue = '';
      viewportRows[i].childNodes[2].className = '';
    }

    if (showTimestamp) {
      viewportRows[i].childNodes[3].childNodes[0].nodeValue = `${datum.line.timestamp.substring(0,23)}: `;
    } else {
      viewportRows[i].childNodes[3].childNodes[0].nodeValue = '';
    }

    // TODO: very large strings cause rendering delays when scrolling, but
    // not sure if stuffing the large string into a class is going to cause
    // headaches with formatting and who know what other issues.
    viewportRows[i].childNodes[4].childNodes[0].nodeValue = datum.line.message.substring(0,300);

    viewportRows[i].classList.remove('hide');
    viewportRows[i].setAttribute(`data-rowindex`, i+viewportOffset);
  }

 for (let i=maxRender; i<viewportRows.length; i++) {
    viewportRows[i].classList.add('hide');
  }
}

export function bootstrapRows() {
  while (true) {
    initDomRow();
    if ((container.clientHeight) > (window.innerHeight - HEIGHT_OFFSET)) {
      break;
    }
  }

  // Add more rows for scrolling
  for (let i=0; i<SPILL_COUNT; i++) {
    initDomRow();
  }
}

export function setupResizeListener() {
  addEventListener("resize", () => {
    const maxHeight = container.parentElement.clientHeight - HEIGHT_OFFSET + (4 * ROW_HEIGHT);
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

function showDetails(lineElem, buttonElem, lineRow) {
  lineElem.classList.add('selected');
  const detailContainer = document.createElement('div');
  detailContainer.classList.add('message-detail-container');

  buttonElem.nodeValue = 'hide';

  const dataAttrs = fuzzyData[lineRow].line;
  Object.entries(dataAttrs).sort().forEach(([key, val]) => {
    if (key === 'message') {
      return;
    }

    const rowContainer = document.createElement('div');
    rowContainer.classList.add('message-detail-row');

    const attrName = key
    const elem = document.createElement('div');
    const text = document.createTextNode(`${attrName}: ${val}`);
    elem.replaceChildren(text);
    elem.classList.add('message-details');

    if (!isPinnedAttr(attrName)) {
      const pin = document.createElement('button');
      const pinText = document.createTextNode('📌');
      pin.setAttribute('title', 'pin to sidenav');
      pin.classList.add('message-details');
      pin.classList.add('pin');
      pin.appendChild(pinText);
      pin.onclick = (_e) => {
        rawData.forEach((datum) => {
          pinNewAttr(datum.line, attrName);
        })
        pin.remove();
        elem.classList.add('detail-gap');
        renderSidenav();
      };
      rowContainer.appendChild(pin);
    } else {
      elem.classList.add('detail-gap');
    }

    rowContainer.appendChild(elem);
    detailContainer.appendChild(rowContainer);
  })

  // The full message always comes last.
  const rowContainer = document.createElement('div');
  rowContainer.classList.add('message-detail-row');
  const elem = document.createElement('div');
  const pre = document.createElement('pre');
  const text = document.createTextNode(`${fuzzyData[lineRow].line.message}`);
  pre.replaceChildren(text);
  elem.replaceChildren(pre);
  elem.classList.add('message-details');
  elem.classList.add('detail-message');
  detailContainer.appendChild(elem);
  rowContainer.appendChild(detailContainer);

  lineElem.appendChild(rowContainer);
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
    const lineElem = e.target.parentNode;
    const isOpen = div.classList.contains('selected');
    const rowIndex = parseInt(lineElem.getAttribute('data-rowindex'), 10);
    fuzzyData[rowIndex].selected = !isOpen;

    if (!isOpen) {
      showDetails(lineElem, e.target.childNodes[0], rowIndex);
    } else {
      e.target.childNodes[0].nodeValue = 'show';
      div.classList.remove('selected');
      div.replaceChildren(toggle, filename, sev, timestamp, message);
    }
  };
  container.append(div);
  viewportRows.push(div);
}
