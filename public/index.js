const MAX_LINES = 5000;

let last = 0;
let ready = false;
let rows = [];
let entrypoint = document.getElementById('stuff');

function writeLog(msg) {
  const lines = msg.split('\n').filter(line => line.length !== 0).slice(-MAX_LINES);
  lines.forEach((line) => {
    const text = document.createTextNode(line);
    // Bootstrap mode
    if (last < MAX_LINES-1) {
      rows[last].replaceChildren(text);
      last += 1;
    // Slow(probably?), standard mode
    } else {
      rows.shift().remove();
      const d = document.createElement('div');
      d.replaceChildren(text);
      entrypoint.append(d);
      rows.push(d);
    }
  });
}

for(let i = 0; i < MAX_LINES; i++) {
  let div = document.createElement('div');
  rows.push(div);
  entrypoint.append(div);
}

// Create WebSocket connection.
const socket = new WebSocket('ws://localhost:8000/socket');
socket.onopen = () => socket.send('ready');
socket.onmessage = (event) => {
  if (event.data === 'hello') {
    ready = true;
  } else if (ready) {
    writeLog(event.data)
  } else {
    logger.error('Got message before ready');
  }
}
