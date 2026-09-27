// Shows the copy button only when the Clipboard API is available.
for (const button of document.querySelectorAll("[data-copy]")) {
  if (!navigator.clipboard) continue;
  const label = button.textContent;
  const status = button.nextElementSibling;
  button.hidden = false;
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = status.textContent = button.dataset.copied;
    setTimeout(() => (button.textContent = label), 2500);
  });
}
