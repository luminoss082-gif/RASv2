export function initMobileUI() {

  const scrollBtn =
    document.getElementById(
      "scrollTopBtn"
    );

  if (!scrollBtn) return;

  window.addEventListener(
    "scroll",
    () => {

      if (window.scrollY > 300) {

        scrollBtn.classList.add("show");

      } else {

        scrollBtn.classList.remove("show");

      }

    }
  );

  scrollBtn.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top:0,
        behavior:"smooth"
      });

    }
  );

}