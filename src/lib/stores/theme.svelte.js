const STORAGE_KEY = 'danwa-dark-mode';

function getInitialDark() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let dark = $state(getInitialDark());

function applyToDom() {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem(STORAGE_KEY, String(dark));
}

applyToDom();

export function isDark() {
  return dark;
}

export function toggleDark() {
  dark = !dark;
  applyToDom();
}
