for (const button of document.querySelectorAll<HTMLButtonElement>(".ig-heart")) {
  const likes = button.parentElement?.querySelector<HTMLElement>(".ig-likes");
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    button.textContent = on ? "♥" : "♡";
    if (likes) likes.textContent = on ? "1 like" : "0 likes";
  });
}
