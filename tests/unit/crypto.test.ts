import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

describe("token encryption", () => {
  it("round-trips and doesn't store plaintext", () => {
    const enc = encryptSecret("gho_secret123")!;
    expect(enc).toMatch(/^enc:v1:/);
    expect(enc).not.toContain("gho_secret123");
    expect(decryptSecret(enc)).toBe("gho_secret123");
  });
  it("uses a fresh IV each time", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });
  it("passes legacy plaintext and nulls through", () => {
    expect(decryptSecret("gho_plain")).toBe("gho_plain");
    expect(encryptSecret(null)).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });
  it("is idempotent on already-encrypted values", () => {
    const enc = encryptSecret("abc")!;
    expect(encryptSecret(enc)).toBe(enc);
  });
  it("rejects tampered ciphertext", () => {
    const enc = encryptSecret("abc")!;
    const tampered = enc.slice(0, -4) + (enc.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
