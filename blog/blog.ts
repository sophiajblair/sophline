const slides = document.getElementById("ig-slides");
const dots = document.querySelectorAll<HTMLElement>("#ig-dots i");
const count = document.getElementById("ig-count");
const heart = document.getElementById("ig-heart");

if (slides) {
  slides.addEventListener(
    "scroll",
    () => {
      const index = Math.round(slides.scrollLeft / slides.clientWidth);
      dots.forEach((dot, i) => dot.classList.toggle("is-on", i === index));
      if (count) count.textContent = `${index + 1} / ${dots.length}`;
    },
    { passive: true },
  );
  slides.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") slides.scrollBy({ left: slides.clientWidth, behavior: "smooth" });
    if (event.key === "ArrowLeft") slides.scrollBy({ left: -slides.clientWidth, behavior: "smooth" });
  });
}

heart?.addEventListener("click", () => {
  const on = heart.getAttribute("aria-pressed") !== "true";
  heart.setAttribute("aria-pressed", String(on));
  heart.textContent = on ? "♥" : "♡";
});
