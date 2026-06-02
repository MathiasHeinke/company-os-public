const mobileQuery = window.matchMedia("(max-width: 680px)");

function isActiveBubble(bubble) {
  const style = window.getComputedStyle(bubble);
  return Number(style.opacity || 0) > 0.45 && style.pointerEvents !== "none";
}

function setBubbleOpen(bubble, isOpen) {
  bubble.dataset.mobileNoteOpen = isOpen ? "true" : "false";
  bubble.classList.toggle("mobile-note-expanded", isOpen);
  bubble.classList.toggle("mobile-note-collapsed", !isOpen);

  const toggle = bubble.querySelector(".mobile-eve-note-toggle");
  if (!toggle) return;

  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  const hint = toggle.querySelector(".mobile-eve-note-hint");
  if (hint) hint.textContent = isOpen ? "Close note" : "Tap to read";
}

function ensureBubbleToggle(bubble) {
  if (bubble.querySelector(".mobile-eve-note-toggle")) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mobile-eve-note-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = `
    <span class="mobile-eve-note-copy">
      <b>EVE wrote you</b>
      <span class="mobile-eve-note-hint">Tap to read</span>
    </span>
    <span class="mobile-eve-note-icon" aria-hidden="true">⌄</span>
  `;

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setBubbleOpen(bubble, !bubble.classList.contains("mobile-note-expanded"));
  });

  bubble.insertBefore(toggle, bubble.firstChild);
}

function applyMobileEveMessages() {
  const isMobile = mobileQuery.matches;

  document.querySelectorAll(".eve-bubble").forEach((bubble) => {
    if (!isMobile) {
      bubble.querySelector(".mobile-eve-note-toggle")?.remove();
      bubble.classList.remove("mobile-note-ready", "mobile-note-collapsed", "mobile-note-expanded");
      delete bubble.dataset.mobileNoteWasActive;
      delete bubble.dataset.mobileNoteOpen;
      return;
    }

    ensureBubbleToggle(bubble);
    bubble.classList.add("mobile-note-ready");
    const active = isActiveBubble(bubble);

    if (!active) {
      delete bubble.dataset.mobileNoteWasActive;
      setBubbleOpen(bubble, false);
      return;
    }

    if (bubble.dataset.mobileNoteWasActive !== "true") {
      bubble.dataset.mobileNoteWasActive = "true";
      setBubbleOpen(bubble, false);
    } else {
      setBubbleOpen(bubble, bubble.dataset.mobileNoteOpen === "true");
    }
  });

  window.requestAnimationFrame(applyMobileEveMessages);
}

window.requestAnimationFrame(applyMobileEveMessages);
