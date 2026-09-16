export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "tiebreak:theme";

/**
 * Runs before first paint (inlined in <head>), so a dark-mode visitor never
 * sees a flash of the light theme. Only an explicit choice sets data-theme;
 * "system" leaves it off and the CSS follows prefers-color-scheme.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`;

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export const NEXT_THEME: Record<ThemePreference, ThemePreference> = { system: "light", light: "dark", dark: "system" };
