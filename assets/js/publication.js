// Revalidate retained pages: the static host can cache HTML for ten minutes.
(() => {
  "use strict";
  const selector = 'meta[name="publication-revision"]';
  const revision = document.querySelector(selector)?.content;
  if (!revision) return;
  const address = new URL(location.href);
  if (address.searchParams.has("__publication")) {
    address.searchParams.delete("__publication");
    history.replaceState(history.state, "", address);
  }
  let checking = false;
  let pending = false;
  let navigating = false;

  async function refresh() {
    if (document.hidden || navigating) return;
    if (checking) {
      pending = true;
      return;
    }
    checking = true;
    const fresh = new URL(location.href);
    fresh.searchParams.set("__publication", crypto.randomUUID());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(fresh, {
        cache: "no-store",
        mode: "same-origin",
        redirect: "error",
        signal: controller.signal,
      });
      let changed = response.status === 404;
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("text/html")
      ) {
        const current = new DOMParser()
          .parseFromString(await response.text(), "text/html")
          .querySelector(selector)?.content;
        changed = /^[a-f0-9]{64}$/.test(current || "") && current !== revision;
      }
      if (changed) {
        navigating = true;
        location.replace(fresh.href);
      }
    } catch {
      // Keep the readable page during an outage and retry when it is visible.
    } finally {
      clearTimeout(timeout);
      checking = false;
      if (pending) {
        pending = false;
        void refresh();
      }
    }
  }
  addEventListener("pageshow", refresh);
  addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  setInterval(refresh, 30000);
})();
