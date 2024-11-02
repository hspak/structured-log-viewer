// SPEED
// https://github.com/gabrielpetersson/fast-grid
// Data in massive array
// Render loop on separate listener
// Custom scroll bar
// Only has many rows DOM elements as you can see (nothing offscreen)

const HEIGHT_OFFSET = 8 + 8 + 21.602 + 10.39;

let container = document.getElementById("stuff");

let viewportHeight = container.clientHeight; // TODO: subtrack header height
const viewportRows = [];

console.log("height", viewportHeight);
for (let i = 0; i < 100; i++) {
  const elem = document.createElement("div");
  const text = document.createTextNode(`row${i}`);
  elem.appendChild(text);
  container.appendChild(elem);
  viewportRows.push(elem);
  if ((container.clientHeight) > (container.parentElement.clientHeight - HEIGHT_OFFSET)) {
    break;
  }
}

function render() {
}


addEventListener("resize", (event) => {
  const maxHeight = container.parentElement.clientHeight - HEIGHT_OFFSET;
  while (container.clientHeight < maxHeight) {
    const elem = document.createElement("div");
    const text = document.createTextNode(`rownew`);
    elem.appendChild(text);
    container.appendChild(elem);
    viewportRows.push(elem); 
    console.log('added');
  }
  while (container.clientHeight >= maxHeight) {
    viewportRows.pop().remove();
    console.log('removed');
  }
});
