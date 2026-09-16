/**
 * Where to go after logging in. Only same-site paths are allowed, so a crafted
 * `?next=https://evil.example` link can't bounce a creator off-site.
 */
export function safeNextPath(next: string | string[] | undefined, fallback = "/"): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  try {
    const url = new URL(value, "http://tiebreak.internal");
    if (url.origin !== "http://tiebreak.internal") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
