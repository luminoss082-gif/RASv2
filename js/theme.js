
/* =========================
   THEME LIGHT / DARK
========================= */

export function initTheme() {

  const themeToggle = document.getElementById("themeToggle");

  if (!themeToggle) return;

  // thème sauvegardé
  const savedTheme =
    localStorage.getItem("theme") || "theme-light";

  document.body.classList.remove(
    "theme-light",
    "theme-dark"
  );

  document.body.classList.add(savedTheme);

  // bouton toggle
  themeToggle.addEventListener("click", () => {

    const isDark =
      document.body.classList.contains("theme-dark");

    document.body.classList.remove(
      "theme-light",
      "theme-dark"
    );

    const newTheme = isDark
      ? "theme-light"
      : "theme-dark";

    document.body.classList.add(newTheme);

    localStorage.setItem("theme", newTheme);
  });

}
