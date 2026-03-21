import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class name utility)", () => {
  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes with a space", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values (undefined, null, false)", () => {
    expect(cn("foo", undefined, null, false as unknown as string, "bar")).toBe("foo bar");
  });

  it("handles conditional class objects (truthy key is included)", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("handles conditional class objects (falsy key is excluded)", () => {
    expect(cn({ active: false })).toBe("");
  });

  it("merges conflicting Tailwind classes (last wins)", () => {
    // tailwind-merge should resolve conflicting utilities
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("merges text colour conflicts correctly", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("preserves non-conflicting Tailwind classes", () => {
    const result = cn("flex", "items-center", "p-4");
    expect(result).toBe("flex items-center p-4");
  });

  it("handles an array of class values", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles mixed strings, objects, and arrays", () => {
    const result = cn("base", { extra: true }, ["a", "b"]);
    expect(result).toBe("base extra a b");
  });

  it("deduplicates identical Tailwind classes", () => {
    // tailwind-merge keeps the last occurrence
    const result = cn("bg-black", "bg-black");
    expect(result).toBe("bg-black");
  });
});
