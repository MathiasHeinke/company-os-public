function alignHashToSlide() {
  if (!window.location.hash) return;
  const id = window.location.hash.slice(1);
  const target = document.getElementById(id);
  if (!target) return;
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
  });
}

window.addEventListener("load", alignHashToSlide);
window.addEventListener("hashchange", alignHashToSlide);
setTimeout(alignHashToSlide, 120);
setTimeout(alignHashToSlide, 420);
