// Folds the navigation into a menu on narrow screens and slides the header
// away while the reader scrolls down; scrolling up brings it back.
// Loaded in <head> so the "js" class applies before first paint. Without
// JavaScript the header stays in the page flow with every link visible.
(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");

  addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".site-header");
    const button = header?.querySelector(".menu-toggle");
    if (!button) return;
    const wide = matchMedia("(min-width: 1100px)");
    let lastY = scrollY;
    let hidden = false;
    let jumping = false;
    let queued = false;

    const isOpen = () => button.getAttribute("aria-expanded") === "true";

    function offset() {
      root.style.setProperty(
        "--header-offset",
        hidden
          ? "0px"
          : `${header.querySelector(".header-bar").offsetHeight}px`,
      );
    }

    function setHidden(value) {
      if (value === hidden) return;
      hidden = value;
      header.classList.toggle("is-hidden", value);
      offset();
    }

    function setOpen(open) {
      button.setAttribute("aria-expanded", String(open));
      header.classList.toggle("is-open", open);
      if (open) setHidden(false);
    }

    function update() {
      queued = false;
      const y = Math.max(scrollY, 0);
      const delta = y - lastY;
      header.classList.toggle("is-stuck", y > 0);
      if (jumping) {
        // An in-page link moved the page: keep the header out of the target's way.
        jumping = false;
        setHidden(y > header.offsetHeight);
      } else if (y <= header.offsetHeight) {
        setHidden(false);
      } else if (Math.abs(delta) < 6) {
        return;
      } else if (delta > 0) {
        if (!isOpen() && !header.contains(document.activeElement))
          setHidden(true);
      } else {
        setHidden(false);
      }
      lastY = y;
    }

    button.addEventListener("click", () => setOpen(!isOpen()));
    header.addEventListener("focusin", () => setHidden(false));
    addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !isOpen()) return;
      setOpen(false);
      button.focus();
    });
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.('a[href*="#"]');
      if (link && link.pathname === location.pathname && link.hash)
        jumping = true;
      if (isOpen() && !header.contains(event.target)) setOpen(false);
    });
    addEventListener("hashchange", () => (jumping = true));
    wide.addEventListener("change", () => {
      setOpen(false);
      offset();
    });
    addEventListener(
      "scroll",
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(update);
      },
      { passive: true },
    );
    addEventListener("resize", offset, { passive: true });
    offset();
    update();
  });
})();
