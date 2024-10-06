let last = 0;
let ready = false;

function writeLog(msg) {
  const lines = msg.split('\n').filter(line => line.length !== 0).slice(-5000);
  lines.forEach((line) => {
    const text = document.createTextNode(line);
    console.log(last)
    rows[last].replaceChildren(text);
    if (last < 4999) {
      last += 1;
    } else {
      last = 0
    }
  });
}

let rows = [];
let entrypoint = document.getElementById('stuff');
for(let i = 0; i < 5000; i++) {
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
