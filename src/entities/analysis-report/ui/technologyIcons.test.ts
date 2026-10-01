import { expect, it } from "vitest";
import { TECHNOLOGY_ICONS } from "./technologyIcons";

it("maps detected technology names to Simple Icons marks", () => {
  for (const name of [
    "Next.js",
    "React",
    "Vue",
    "SvelteKit",
    "GitHub",
    "Cloudflare",
    "Hotwire Turbo",
    "Meta Pixel",
  ])
    expect(TECHNOLOGY_ICONS[name]?.path, name).toBeTruthy();
  for (const name of ["Heroku", "Amazon CloudFront", "Turbopack"])
    expect(TECHNOLOGY_ICONS[name], name).toBeUndefined();
});
