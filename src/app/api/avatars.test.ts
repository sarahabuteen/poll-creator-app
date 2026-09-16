import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "./avatars/[seed]/[tint]/route";

const get = (seed: string, tint: string) =>
  GET(new NextRequest(`http://localhost/api/avatars/${seed}/${tint}`), { params: Promise.resolve({ seed, tint }) });

describe("GET /api/avatars/:seed/:tint", () => {
  it("renders the face as a long-cached, locked-down SVG", async () => {
    const response = await get("Priya", "f8c9b9");
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("f8c9b9");
  });

  it("is deterministic: the same seed and tint draw the same face", async () => {
    const [a, b, other] = await Promise.all([get("Sam", "f6e0a4"), get("Sam", "f6e0a4"), get("Kai", "f6e0a4")]);
    const [svgA, svgB, svgOther] = await Promise.all([a.text(), b.text(), other.text()]);
    expect(svgA).toBe(svgB);
    expect(svgA).not.toBe(svgOther);
  });

  it("refuses tints outside the brand set and oversized seeds", async () => {
    expect((await get("Priya", "ff0000")).status).toBe(400);
    expect((await get("x".repeat(65), "f8c9b9")).status).toBe(400);
  });
});
