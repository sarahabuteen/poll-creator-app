export type ThemePreference = "system" | "light" | "dark";

/**
 * An explicit theme choice lives in a cookie, so the server renders
 * data-theme straight into the HTML: no flash of the wrong theme and no inline
 * script. "System" is the absence of the cookie; CSS follows
 * prefers-color-scheme on its own.
 */
export const THEME_COOKIE = "tiebreak-theme";

export function parseThemeCookie(value: string | undefined): "light" | "dark" | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") {
    delete root.dataset.theme;
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } else {
    root.dataset.theme = preference;
    document.cookie = `${THEME_COOKIE}=${preference}; path=/; max-age=31536000; samesite=lax`;
  }
}

export function readThemePreference(): ThemePreference {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  return parseThemeCookie(match?.[1]) ?? "system";
}

export const NEXT_THEME: Record<ThemePreference, ThemePreference> = { system: "light", light: "dark", dark: "system" };
