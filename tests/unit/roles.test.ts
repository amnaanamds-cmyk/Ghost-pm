import { describe, expect, it } from "vitest";
import { assertRole, ForbiddenError, hasRole } from "@/lib/workspace";

describe("roles", () => {
  it("orders OWNER > ADMIN > MEMBER", () => {
    expect(hasRole("OWNER", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("MEMBER", "ADMIN")).toBe(false);
    expect(hasRole("ADMIN", "OWNER")).toBe(false);
  });
  it("assertRole throws a user-facing ForbiddenError", () => {
    expect(() => assertRole({ role: "MEMBER" }, "ADMIN")).toThrow(ForbiddenError);
    expect(() => assertRole({ role: "OWNER" }, "ADMIN")).not.toThrow();
  });
});
