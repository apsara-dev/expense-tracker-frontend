export function getInitialTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) {
    return saved;
  }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.add("light-mode");
    document.body.classList.remove("dark-mode");
  }
  localStorage.setItem("theme", theme);
}
