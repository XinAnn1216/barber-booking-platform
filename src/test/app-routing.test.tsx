import { matchRoutes } from "react-router";
import { describe, expect, it } from "vitest";

import { routes } from "@/routes";

// Match routes without running loaders or rendering: loaders may need a network the
// test run lacks.
describe("App routing", () => {
  it.each(["/", "/app", "/sign-in", "/sign-up"])("matches a page for %s instead of not found", (path) => {
    const matches = matchRoutes(routes, path);

    expect(matches?.at(-1)?.route.path).not.toBe("*");
  });

  it("falls back to not found for unknown paths", () => {
    expect(matchRoutes(routes, "/nope")?.at(-1)?.route.path).toBe("*");
  });
});
