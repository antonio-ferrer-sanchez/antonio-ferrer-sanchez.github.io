// Marks the contents link of the section currently being read, and keeps
// the list folded on narrow screens, where it would otherwise push the text
// a screen down. Without JavaScript the list stays open.
(() => {
  "use strict";
  const links = [
    ...document.querySelectorAll('.article-contents nav a[href^="#"]'),
  ];
  const sections = links
    .map((link) => document.getElementById(link.hash.slice(1)))
    .filter(Boolean);
  if (!sections.length || sections.length !== links.length) return;

  let current = -1;
  let queued = false;

  function mark(index) {
    if (index === current) return;
    if (current >= 0) links[current].removeAttribute("aria-current");
    if (index >= 0) links[index].setAttribute("aria-current", "true");
    current = index;
  }

  function update() {
    queued = false;
    const line = innerHeight * 0.3;
    const atEnd =
      innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    let index = -1;
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= line) index = i;
    });
    mark(atEnd ? sections.length - 1 : index);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  const toggle = document.querySelector(".article-contents details");
  const narrow = matchMedia("(max-width: 1000px)");
  if (toggle) {
    const fold = () => (toggle.open = !narrow.matches);
    fold();
    narrow.addEventListener("change", fold);
    // Choosing a section on a phone folds the list again behind the reader.
    for (const link of links)
      link.addEventListener("click", () => {
        if (narrow.matches) toggle.open = false;
      });
  }

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
})();
