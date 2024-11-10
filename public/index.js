import { populate, render, bootstrapRows, setupResizeListener } from './render.js';
import { setupScrollListeners } from './scrollbar.js';
import { bootstrapSidenav } from './sidenav.js';

let appState = null;                          

const socket = new WebSocket('ws://localhost:8080/socket');
socket.onopen = () => socket.send('ready');
socket.onerror = (err) => {
  console.log('errored?', err);
}
socket.closed = (event) => {
  console.log('closed?', event);
}
socket.onmessage = (event) => {
  if (appState) {
    const d = JSON.parse(event.data);
    populate(d);
    render();
  } else if (event.data === 'hello') {
    appState = "ready";
    bootstrapRows();
    bootstrapSidenav();
    setupResizeListener();
    setupScrollListeners();
  } else {
    logger.error('Got message before ready');
  }
}

