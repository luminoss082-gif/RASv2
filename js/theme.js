/* =========================
   THEME / MODE SOMBRE
========================= */

export function initTheme() {
  const body = document.body;
  const themeToggle = document.getElementById("themeToggle");

  const saved = localStorage.getItem("loveconnect-theme");
  if (saved) {
    if (saved === "dark") body.classList.add("theme-dark");
  } else {
    const hour = new Date().getHours();
    if (hour >= 20 || hour <= 7) body.classList.add("theme-dark");
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      body.classList.toggle("theme-dark");
      localStorage.setItem(
        "loveconnect-theme",
        body.classList.contains("theme-dark") ? "dark" : "light"
      );
    });
  }
}
