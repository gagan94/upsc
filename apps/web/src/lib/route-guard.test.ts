import { describe, expect, it } from "vitest";
import { decideRedirect } from "./route-guard";

describe("decideRedirect", () => {
  it("redirects signed-out users on protected paths to login with return_to", () => {
    expect(decideRedirect({ pathname: "/learn", search: "?a=1", signedIn: false })).toBe(
      "/login?return_to=%2Flearn%3Fa%3D1",
    );
  });
  it("allows public paths when signed out", () => {
    for (const p of ["/login", "/signup", "/auth/callback"]) {
      expect(decideRedirect({ pathname: p, search: "", signedIn: false })).toBeNull();
    }
  });
  it("sends signed-in users away from login/signup", () => {
    expect(decideRedirect({ pathname: "/login", search: "", signedIn: true })).toBe("/home");
    expect(decideRedirect({ pathname: "/signup", search: "", signedIn: true })).toBe("/home");
  });
  it("lets signed-in users through elsewhere", () => {
    expect(decideRedirect({ pathname: "/learn", search: "", signedIn: true })).toBeNull();
    expect(decideRedirect({ pathname: "/auth/callback", search: "", signedIn: true })).toBeNull();
  });
  it("never redirects /auth/signout, signed in or out (avoids a login loop)", () => {
    expect(decideRedirect({ pathname: "/auth/signout", search: "", signedIn: true })).toBeNull();
    expect(decideRedirect({ pathname: "/auth/signout", search: "", signedIn: false })).toBeNull();
  });
});
