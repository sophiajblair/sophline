for (const post of document.querySelectorAll<HTMLElement>(".ig-post")) {
  const likes = post.querySelector<HTMLElement>(".ig-likes");
  const toggle = (button: HTMLElement | null, on: boolean) => button?.setAttribute("aria-pressed", String(on));
  const heart = post.querySelector<HTMLElement>(".ig-heart");
  const save = post.querySelector<HTMLElement>(".ig-save");
  heart?.addEventListener("click", () => {
    const on = heart.getAttribute("aria-pressed") !== "true";
    toggle(heart, on);
    if (likes) likes.textContent = on ? "1 like" : "0 likes";
  });
  save?.addEventListener("click", () => toggle(save, save.getAttribute("aria-pressed") !== "true"));
}
