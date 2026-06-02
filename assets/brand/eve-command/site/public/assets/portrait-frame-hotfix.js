const desktopActorMaxWidth = () => (window.innerWidth >= 1600 ? 33 : 34);

function actorSide(actor) {
  if (actor.classList.contains("actor-side-left")) return "left";
  if (actor.classList.contains("actor-side-center")) return "center";
  return "right";
}

function actorX(side, width) {
  if (side === "left") return 5;
  if (side === "center") return 50 - width / 2;
  return 100 - width - 4;
}

function applyPortraitActorFrame() {
  if (window.innerWidth <= 1100) return;

  const actor = document.querySelector(".actor-single");
  if (!actor) return;

  const rawWidth = Number.parseFloat(actor.style.getPropertyValue("--actor-width"));
  if (!Number.isFinite(rawWidth)) return;

  const width = Math.min(rawWidth, desktopActorMaxWidth());
  const side = actorSide(actor);

  actor.style.setProperty("--actor-width", `${width}vw`);
  actor.style.setProperty("--actor-x", `${actorX(side, width)}vw`);
}

function frameLoop() {
  applyPortraitActorFrame();
  window.requestAnimationFrame(frameLoop);
}

window.addEventListener("resize", applyPortraitActorFrame);
window.requestAnimationFrame(frameLoop);
