import { reservedNames, HEIGHT_OFFSET } from './constants.mjs';
import { isPinnedAttr, setupDefaultAttrs,filter, renderSidenav, pinNewAttr } from './sidenav.mjs';
import { updateScrollThumb } from './scrollbar.mjs';

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
  });
  renderSidenav();
}

export function updateFuzzyData(updatedData) {
  fuzzyData = updatedData;
}

export function updateViewportOffset(offset) {
  viewportOffset = offset;
}

export function render() {
  filter();

  const maxRender = Math.min(viewportRows.length, Math.max(0, fuzzyData.length - viewportOffset));

  for (let i=0; i<maxRender; i++) {
    const datum = fuzzyData[i + viewportOffset];

    if (!datum.selected && viewportRows[i].classList.contains('selected')) {
      viewportRows[i].classList.remove('selected');
      viewportRows[i].childNodes[0].childNodes[0].nodeValue = 'show';
      while (viewportRows[i].childNodes.length > 5) {
        viewportRows[i].removeChild(viewportRows[i].lastChild);
      }
    } else if (datum.selected && !viewportRows[i].classList.contains('selected')) {
      showDetails(viewportRows[i], viewportRows[i].childNodes[0].childNodes[0], i+viewportOffset);
    }

    viewportRows[i].childNodes[1].childNodes[0].nodeValue = `${datum.line.filename}: `;
    viewportRows[i].childNodes[2].childNodes[0].nodeValue = datum.line.severity;
    viewportRows[i].childNodes[3].childNodes[0].nodeValue = `${datum.line.timestamp.substring(0,23)}: `;

    // TODO: very large strings cause rendering delays when scrolling, but
    // not sure if stuffing the large string into a class is going to cause
    // headaches with formatting and who know what other issues.
    viewportRows[i].childNodes[4].childNodes[0].nodeValue = datum.line.message.substring(0,200);

    if (datum.line.severity === 'DEBUG') {
      viewportRows[i].childNodes[2].className = 'severity-debug';
    } else if (datum.line.severity === 'WARNING') {
      viewportRows[i].childNodes[2].className = 'severity-warning';
    } else if (datum.line.severity === 'ERROR') {
      viewportRows[i].childNodes[2].className = 'severity-error';
    } else {
      viewportRows[i].childNodes[2].className = 'severity-info';
    }

    viewportRows[i].classList.remove('hide');
    viewportRows[i].setAttribute(`data-rowindex`, i+viewportOffset);
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

function showDetails(lineElem, buttonElem, lineRow) {
  lineElem.classList.add('selected');
  const detailContainer = document.createElement('div');
  detailContainer.classList.add('message-detail-container');

  buttonElem.nodeValue = 'hide';

  const dataAttrs = fuzzyData[lineRow].line;
  Object.entries(dataAttrs).forEach(([key, val]) => {
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
  const text = document.createTextNode(`${fuzzyData[lineRow].line.message}`);
  elem.replaceChildren(text);
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
