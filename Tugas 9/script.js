feather.replace();

const navbarNav = document.querySelector(".nav-menu");
document.querySelector("#hamburger-menu").onclick = () => {
  navbarNav.classList.toggle("active");
};

const hamburger = document.querySelector("#hamburger-menu");
document.addEventListener("click", function (e) {
  if (!hamburger.contains(e.target) && !navbarNav.contains(e.target)) {
    navbarNav.classList.remove("active");
  }
});

window.addEventListener("scroll", () => {
  const nav = document.querySelector(".header-main");
  const navOff = nav.offsetTop;
  window.scrollY > navOff
    ? nav.classList.add("blurs")
    : nav.classList.remove("blurs");
});
