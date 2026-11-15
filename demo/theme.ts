import { initial } from './settings';

const THEME_KEY = 'gpucanvas.theme';

/** Whether the page is dark: the URL decides first, then the theme picked last time. */
export const readTheme = () => {
  try {
    return (initial.theme ?? localStorage.getItem(THEME_KEY)) === 'dark';
  } catch {
    return false;
  }
};

export const applyTheme = (dark: boolean) =>
  document.documentElement.classList.toggle('dark', dark);

/** Applies the theme and keeps it for the next visit. */
export function saveTheme(dark: boolean) {
  applyTheme(dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch {
    // The theme just won't persist.
  }
}

/** The page background, which the canvas clears to so it matches the theme. */
export const backgroundColor = () => getComputedStyle(document.body).backgroundColor;
