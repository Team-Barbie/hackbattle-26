import { describe, expect, it } from "vitest";
import { routeForSession } from "./sessionRole";

describe("routeForSession", () => {
  it("reopens the therapist studio when that role is remembered", () => {
    expect(routeForSession("therapist", true)).toBe("therapist");
    expect(routeForSession("therapist", false)).toBe("therapist");
  });

  it("keeps a signed-in patient on their doctor's plan", () => {
    expect(routeForSession("patient", true)).toBe("home");
  });

  it("sends a remembered patient back to sign-in if their profile is gone", () => {
    expect(routeForSession("patient", false)).toBe("login");
  });

  it("falls back to the last patient profile when no role was stored", () => {
    expect(routeForSession(null, true)).toBe("home");
    expect(routeForSession(null, false)).toBe("role");
  });
});
