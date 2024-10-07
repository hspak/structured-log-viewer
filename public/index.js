const MAX_LINES = 5000;

let last = -1;
let ready = false;
let rows = [];
let entrypoint = document.getElementById('stuff');

function writeLog(msg) {
  msg.forEach((blob) => {
    console.log(blob)
    const file = blob.filename;
    const lines = blob.content.split('\n').filter(line => line.length !== 0).slice(-MAX_LINES);
    lines.forEach((line) => {
      if (last === MAX_LINES-1) {
        for (let i=0; i < MAX_LINES-1; i++) {
          rows[i].nodeValue = rows[i+1].nodeValue;
        }
      } else {
        last += 1;
      }
      rows[last].nodeValue = `${file}: ${line}`;
    });
  });
}

for(let i = 0; i < MAX_LINES; i++) {
  const div = document.createElement('div');
  const text = document.createTextNode('');
  div.replaceChildren(text);
  entrypoint.append(div);
  rows.push(text);
}

// Create WebSocket connection.
const socket = new WebSocket('ws://localhost:8000/socket');
socket.onopen = () => socket.send('ready');
socket.onmessage = (event) => {
  if (event.data === 'hello') {
    ready = true;
  } else if (ready) {
    writeLog(JSON.parse(event.data));
  } else {
    logger.error('Got message before ready');
  }
}
