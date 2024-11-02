const scrollAreaY = document.createElement("div");
scrollAreaY.classList.add("scroll-area");

const scrollThumbY = document.createElement("div");
scrollThumbY.classList.add("scroll-thumb");

let scrollOffsetY = 0;

function preventDefault(e) {
  e.preventDefault();
}

function scrollBy(offset) {
  const min = Math.min(offset, container.clientHeight - HEIGHT_OFFSET);
  const clamped = Math.max(0, min);
  console.log(min, clamped)
  scrollThumbY.style.transform = `translateY(${clamped}px)`;
}

function onThumbDrag(e) {
  e.preventDefault();
  e.stopPropagation();
  scrollOffsetY += e.movementY;
  scrollBy(scrollOffsetY);
}

function onThumbMouseUp() {
  document.body.style.removeProperty("cursor");
  document.removeEventListener("mousemove", onThumbDrag);
  document.removeEventListener("mouseup", onThumbMouseUp);
}

function onThumbMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  document.body.style.setProperty("cursor", "grabbing", "important");
  document.addEventListener("mousemove", onThumbDrag);
  document.addEventListener("mouseup", onThumbMouseUp);
}

function onContainerWheel(e) {
  e.preventDefault();
  e.stopPropagation();

  scrollOffsetY += e.deltaY;
  scrollBy(scrollOffsetY);

  // TODO: consider the isScrolling trick
  // window.requestAnimationFrame(() => {})
}

scrollAreaY.addEventListener("mousemove", preventDefault);
scrollAreaY.addEventListener("mousedown", preventDefault);

scrollThumbY.addEventListener("mousedown", onThumbMouseDown);

// https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
container.addEventListener("wheel", onContainerWheel);

container.prepend(scrollThumbY);
container.prepend(scrollAreaY);
