import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveTimestamps, findTripByCodeSuffix } from "./storageUtils";

// ---------------------------------------------------------------------------
// resolveTimestamps
// ---------------------------------------------------------------------------
describe("resolveTimestamps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets startedAt to now when status is 'in_progress'", () => {
    const out = resolveTimestamps("in_progress", {});
    expect(out.startedAt).toBeInstanceOf(Date);
    expect(out.startedAt!.toISOString()).toBe("2025-06-15T12:00:00.000Z");
    expect(out.completedAt).toBeUndefined();
  });

  it("sets completedAt to now when status is 'completed'", () => {
    const out = resolveTimestamps("completed", {});
    expect(out.completedAt).toBeInstanceOf(Date);
    expect(out.completedAt!.toISOString()).toBe("2025-06-15T12:00:00.000Z");
    expect(out.startedAt).toBeUndefined();
  });

  it("sets neither timestamp for other statuses", () => {
    for (const status of ["requested", "accepted", "arriving", "cancelled", undefined]) {
      const out = resolveTimestamps(status, {});
      expect(out.startedAt).toBeUndefined();
      expect(out.completedAt).toBeUndefined();
    }
  });

  it("converts a string startedAt in existing data to a Date", () => {
    const out = resolveTimestamps(undefined, { startedAt: "2025-01-10T08:00:00Z" });
    expect(out.startedAt).toBeInstanceOf(Date);
    expect(out.startedAt!.toISOString()).toBe("2025-01-10T08:00:00.000Z");
  });

  it("converts a string completedAt in existing data to a Date", () => {
    const out = resolveTimestamps(undefined, { completedAt: "2025-01-10T09:30:00Z" });
    expect(out.completedAt).toBeInstanceOf(Date);
    expect(out.completedAt!.toISOString()).toBe("2025-01-10T09:30:00.000Z");
  });

  it("does NOT override an already-Date startedAt (status-driven new Date takes precedence)", () => {
    // When status = in_progress, the function creates a fresh Date regardless
    const out = resolveTimestamps("in_progress", { startedAt: "2020-01-01T00:00:00Z" });
    expect(out.startedAt!.toISOString()).toBe("2025-06-15T12:00:00.000Z");
  });

  it("leaves existing data untouched when no conversion is needed", () => {
    const out = resolveTimestamps("accepted", { startedAt: null, completedAt: null });
    expect(out.startedAt).toBeUndefined();
    expect(out.completedAt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findTripByCodeSuffix
// ---------------------------------------------------------------------------
describe("findTripByCodeSuffix", () => {
  const trips = [
    { id: "550e8400-e29b-41d4-a716-446655440000", status: "completed" },
    { id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", status: "requested" },
    { id: "6ba7b811-9dad-11d1-80b4-00c04fd430c9", status: "cancelled" },
  ];

  it("finds a trip whose stripped ID ends with the given suffix", () => {
    const found = findTripByCodeSuffix(trips, "440000");
    expect(found).toBeDefined();
    expect(found!.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("is case-insensitive", () => {
    expect(findTripByCodeSuffix(trips, "440000")).toBeDefined();
    expect(findTripByCodeSuffix(trips, "440000".toUpperCase())).toBeDefined();
  });

  it("returns undefined when no trip matches", () => {
    expect(findTripByCodeSuffix(trips, "xxxxxx")).toBeUndefined();
  });

  it("returns the first matching trip when multiple match the same suffix", () => {
    // Both trip[1] and trip[2] end in 'c8'/'c9' – only 'c8' matches
    const found = findTripByCodeSuffix(trips, "c8");
    expect(found!.id).toBe("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
  });

  it("works with an empty trips array", () => {
    expect(findTripByCodeSuffix([], "abc")).toBeUndefined();
  });

  it("matches a suffix that spans a dash boundary", () => {
    // 'd430c8' spans the last two dash-segments of trip[1]
    const found = findTripByCodeSuffix(trips, "d430c8");
    expect(found).toBeDefined();
    expect(found!.id).toBe("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
  });

  it("matches the full stripped UUID", () => {
    const stripped = trips[0].id.replace(/-/g, "");
    const found = findTripByCodeSuffix(trips, stripped);
    expect(found!.id).toBe(trips[0].id);
  });

  it("does not match when suffix is longer than any stripped ID", () => {
    expect(findTripByCodeSuffix(trips, "a".repeat(40))).toBeUndefined();
  });
});
