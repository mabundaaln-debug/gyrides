import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  calcFareBreakdown,
  calcFare,
  generateTripPin,
  tripIdMatchesSuffix,
  truncate,
  driverPayout,
  PLATFORM_COMMISSION,
  RURAL_SURCHARGE,
} from "./fareUtils";

// ---------------------------------------------------------------------------
// Standard vehicle-type used across multiple tests
// ---------------------------------------------------------------------------
const STANDARD_VT = {
  basePrice: 10,
  pricePerKm: 8,
  pricePerMin: 1.5,
  minimumFare: 25,
};

const PREMIUM_VT = {
  basePrice: 15,
  pricePerKm: 10,
  pricePerMin: 1.8,
  minimumFare: 35,
};

// ---------------------------------------------------------------------------
// haversineDistance
// ---------------------------------------------------------------------------
describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
  });

  it("returns ~111 km for 1 degree of latitude", () => {
    const d = haversineDistance(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it("is symmetric (A→B == B→A)", () => {
    const ab = haversineDistance(-23.315, 30.726, -23.571, 30.697);
    const ba = haversineDistance(-23.571, 30.697, -23.315, 30.726);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it("calculates reasonable distance between two Giyani locations", () => {
    // Giyani CBD (~-23.3153, 30.7256) to Masingita Mall (~-23.3096, 30.6926)
    const d = haversineDistance(-23.3153, 30.7256, -23.3096, 30.6926);
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(5);
  });

  it("handles antipodal points (max distance ~20 015 km)", () => {
    const d = haversineDistance(0, 0, 0, 180);
    expect(d).toBeGreaterThan(20000);
  });
});

// ---------------------------------------------------------------------------
// calcFareBreakdown – standard private trip
// ---------------------------------------------------------------------------
describe("calcFareBreakdown – private trip", () => {
  it("applies base + distance + time correctly", () => {
    const bd = calcFareBreakdown(STANDARD_VT, 5, 10, false);
    // baseFare=10, distFare=round(8*5)=40, timeFare=round(1.5*10)=15 → subtotal=65
    expect(bd.baseFare).toBe(10);
    expect(bd.distFare).toBe(40);
    expect(bd.timeFare).toBe(15);
    expect(bd.rural).toBe(0);
    expect(bd.total).toBe(65);
    expect(bd.minApplied).toBe(false);
  });

  it("enforces the minimum fare", () => {
    // Very short trip: 0 km, 0 min → subtotal = 10 (< minimumFare 25)
    const bd = calcFareBreakdown(STANDARD_VT, 0, 0, false);
    expect(bd.total).toBe(25);
    expect(bd.minApplied).toBe(true);
  });

  it("does NOT apply minimum fare when fare exceeds it", () => {
    const bd = calcFareBreakdown(STANDARD_VT, 5, 10, false);
    expect(bd.total).toBe(65);
    expect(bd.minApplied).toBe(false);
  });

  it("adds rural surcharge when isRural is true", () => {
    const bd = calcFareBreakdown(STANDARD_VT, 5, 10, true);
    expect(bd.rural).toBe(RURAL_SURCHARGE);
    expect(bd.total).toBe(65 + RURAL_SURCHARGE);
  });

  it("does NOT add rural surcharge when isRural is false", () => {
    const bd = calcFareBreakdown(STANDARD_VT, 5, 10, false);
    expect(bd.rural).toBe(0);
  });

  it("computes driverEarns as 85 % of total (rounded)", () => {
    const bd = calcFareBreakdown(STANDARD_VT, 5, 10, false);
    const expected = Math.round(65 * (1 - PLATFORM_COMMISSION));
    expect(bd.driverEarns).toBe(expected);
    expect(bd.driverEarns).toBeGreaterThan(0);
  });

  it("uses a default pricePerMin of 1.5 when not provided", () => {
    const vtNoMin = { basePrice: 10, pricePerKm: 8, pricePerMin: undefined as unknown as number, minimumFare: 25 };
    const bd = calcFareBreakdown(vtNoMin, 0, 10, false);
    expect(bd.timeFare).toBe(Math.round(1.5 * 10));
  });

  it("uses a default minimumFare of 25 when not provided", () => {
    const vtNoMin = { basePrice: 0, pricePerKm: 0, pricePerMin: 0, minimumFare: undefined as unknown as number };
    const bd = calcFareBreakdown(vtNoMin, 0, 0, false);
    expect(bd.total).toBe(25);
    expect(bd.minApplied).toBe(true);
  });

  it("works with PREMIUM_VT pricing", () => {
    const bd = calcFareBreakdown(PREMIUM_VT, 3, 5, false);
    // baseFare=15, distFare=round(10*3)=30, timeFare=round(1.8*5)=9 → subtotal=54
    expect(bd.baseFare).toBe(15);
    expect(bd.distFare).toBe(30);
    expect(bd.timeFare).toBe(9);
    expect(bd.total).toBe(54);
    expect(bd.minApplied).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calcFareBreakdown – shared ride
// ---------------------------------------------------------------------------
describe("calcFareBreakdown – shared ride", () => {
  it("applies 55 % discount per seat for a single shared seat", () => {
    // subtotal without sharing = 65 (5 km, 10 min, standard, no rural)
    // per seat = round(65 * 0.55) = 36; total for 1 seat = 36
    const bd = calcFareBreakdown(STANDARD_VT, 5, 10, false, "shared", 1);
    expect(bd.total).toBe(Math.round(65 * 0.55));
  });

  it("multiplies per-seat price by number of seats", () => {
    const perSeat = Math.round(65 * 0.55);
    const bd = calcFareBreakdown(STANDARD_VT, 5, 10, false, "shared", 3);
    expect(bd.total).toBe(perSeat * 3);
  });

  it("shared fare is less than private fare for the same trip", () => {
    const privateFare = calcFare(STANDARD_VT, 5, 10);
    const sharedFare = calcFare(STANDARD_VT, 5, 10, false, "shared", 1);
    expect(sharedFare).toBeLessThan(privateFare);
  });
});

// ---------------------------------------------------------------------------
// calcFare (convenience wrapper)
// ---------------------------------------------------------------------------
describe("calcFare", () => {
  it("returns the same total as calcFareBreakdown", () => {
    const bd = calcFareBreakdown(STANDARD_VT, 7, 12, true);
    expect(calcFare(STANDARD_VT, 7, 12, true)).toBe(bd.total);
  });

  it("defaults isRural to false", () => {
    expect(calcFare(STANDARD_VT, 5, 10)).toBe(calcFare(STANDARD_VT, 5, 10, false));
  });

  it("defaults rideType to private and sharedSeats to 1", () => {
    expect(calcFare(STANDARD_VT, 5, 10)).toBe(
      calcFare(STANDARD_VT, 5, 10, false, "private", 1),
    );
  });
});

// ---------------------------------------------------------------------------
// generateTripPin
// ---------------------------------------------------------------------------
describe("generateTripPin", () => {
  it("returns a 4-character string", () => {
    const pin = generateTripPin();
    expect(pin).toHaveLength(4);
  });

  it("contains only digits", () => {
    const pin = generateTripPin();
    expect(/^\d{4}$/.test(pin)).toBe(true);
  });

  it("is in the range [1000, 9999]", () => {
    for (let i = 0; i < 50; i++) {
      const pin = Number(generateTripPin());
      expect(pin).toBeGreaterThanOrEqual(1000);
      expect(pin).toBeLessThanOrEqual(9999);
    }
  });

  it("generates different PINs over multiple calls (probabilistic)", () => {
    const pins = new Set(Array.from({ length: 20 }, () => generateTripPin()));
    // With 9000 possible values the probability of all 20 being identical is negligible
    expect(pins.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// tripIdMatchesSuffix
// ---------------------------------------------------------------------------
describe("tripIdMatchesSuffix", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("matches when the suffix is the last chars of the stripped UUID", () => {
    expect(tripIdMatchesSuffix(uuid, "440000")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(tripIdMatchesSuffix(uuid, "440000")).toBe(true);
    expect(tripIdMatchesSuffix(uuid, "440000".toUpperCase())).toBe(true);
  });

  it("does not match a non-matching suffix", () => {
    expect(tripIdMatchesSuffix(uuid, "zzzzzz")).toBe(false);
  });

  it("matches the full stripped UUID", () => {
    const stripped = uuid.replace(/-/g, "");
    expect(tripIdMatchesSuffix(uuid, stripped)).toBe(true);
  });

  it("does not match when suffix is longer than stripped UUID", () => {
    const stripped = uuid.replace(/-/g, "");
    expect(tripIdMatchesSuffix(uuid, stripped + "extra")).toBe(false);
  });

  it("ignores dashes in the trip ID", () => {
    // '446655440000' – spans two dash-separated segments
    expect(tripIdMatchesSuffix(uuid, "446655440000")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------
describe("truncate", () => {
  it("returns the string unchanged when it is shorter than max", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns the string unchanged when it equals max", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and appends ellipsis when string exceeds max", () => {
    const result = truncate("hello world", 8);
    expect(result).toHaveLength(8);
    expect(result.endsWith("…")).toBe(true);
  });

  it("preserves the first max-1 characters before the ellipsis", () => {
    const result = truncate("abcdefgh", 5);
    expect(result).toBe("abcd…");
  });

  it("handles an empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("handles max of 1 (just the ellipsis)", () => {
    expect(truncate("abc", 1)).toBe("…");
  });
});

// ---------------------------------------------------------------------------
// driverPayout
// ---------------------------------------------------------------------------
describe("driverPayout", () => {
  it("returns 85 % of the fare (rounded to 2 dp)", () => {
    expect(driverPayout(100)).toBe(85);
  });

  it("rounds correctly for non-integer fares", () => {
    // 65 * 0.85 = 55.25 → 55.25 (already 2 dp)
    expect(driverPayout(65)).toBeCloseTo(55.25, 2);
  });

  it("returns 0 for a zero fare", () => {
    expect(driverPayout(0)).toBe(0);
  });

  it("is consistent with calcFareBreakdown.driverEarns", () => {
    const bd = calcFareBreakdown(STANDARD_VT, 5, 10, false);
    // driverPayout uses round-to-2dp; driverEarns uses Math.round (integer)
    expect(Math.round(driverPayout(bd.total))).toBe(bd.driverEarns);
  });

  it("PLATFORM_COMMISSION is 0.15", () => {
    expect(PLATFORM_COMMISSION).toBe(0.15);
  });
});
