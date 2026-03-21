/**
 * Pure fare-calculation utilities shared between the RiderApp UI and tests.
 * All functions are side-effect-free so they can be unit-tested without a
 * browser or database.
 */

export interface VehicleTypeFare {
  basePrice: number;
  pricePerKm: number;
  pricePerMin: number;
  minimumFare: number;
}

export interface FareBreakdown {
  baseFare: number;
  distFare: number;
  timeFare: number;
  rural: number;
  total: number;
  driverEarns: number;
  minApplied: boolean;
}

/** Platform commission retained by GY Rides (15 %). */
export const PLATFORM_COMMISSION = 0.15;

/** Flat surcharge added when either pickup or drop-off is a rural location. */
export const RURAL_SURCHARGE = 8;

/**
 * Haversine great-circle distance between two WGS-84 coordinates (kilometres).
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Full fare breakdown for a single trip leg.
 *
 * @param vt          Vehicle-type pricing configuration.
 * @param distanceKm  Trip distance in kilometres.
 * @param durationMin Trip duration in minutes.
 * @param isRural     Whether the trip touches a rural location.
 * @param rideType    "shared" trips apply a per-seat discount (55 % of base).
 * @param sharedSeats Number of seats booked for a shared ride.
 */
export function calcFareBreakdown(
  vt: VehicleTypeFare,
  distanceKm: number,
  durationMin: number,
  isRural: boolean,
  rideType: "private" | "shared" | "taxi" | "parcel" | "medical" = "private",
  sharedSeats = 1,
): FareBreakdown {
  const baseFare = vt.basePrice;
  const distFare = vt.pricePerKm * distanceKm;
  const timeFare = (vt.pricePerMin ?? 1.5) * durationMin;
  let subtotal = Math.round(baseFare + distFare + timeFare);
  const rural = isRural ? RURAL_SURCHARGE : 0;
  subtotal += rural;

  if (rideType === "shared") {
    const perSeat = Math.round(subtotal * 0.55);
    subtotal = perSeat * sharedSeats;
  }

  const minFare = vt.minimumFare ?? 25;
  const total = Math.max(subtotal, minFare);
  const driverEarns = Math.round(total * (1 - PLATFORM_COMMISSION));

  return {
    baseFare,
    distFare: Math.round(distFare),
    timeFare: Math.round(timeFare),
    rural,
    total,
    driverEarns,
    minApplied: subtotal < minFare,
  };
}

/**
 * Convenience wrapper that returns only the final fare total.
 */
export function calcFare(
  vt: VehicleTypeFare,
  distanceKm: number,
  durationMin: number,
  isRural = false,
  rideType: "private" | "shared" | "taxi" | "parcel" | "medical" = "private",
  sharedSeats = 1,
): number {
  return calcFareBreakdown(vt, distanceKm, durationMin, isRural, rideType, sharedSeats).total;
}

/**
 * Generate a random 4-digit trip confirmation PIN.
 * Guaranteed to be in the range [1000, 9999].
 */
export function generateTripPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Determine whether a trip ID (UUID, dashes stripped) ends with the given
 * suffix (case-insensitive).  Mirrors the logic in `DatabaseStorage.getTripByCodeSuffix`.
 */
export function tripIdMatchesSuffix(tripId: string, suffix: string): boolean {
  const normalised = tripId.replace(/-/g, "").toLowerCase();
  return normalised.endsWith(suffix.toLowerCase());
}

/**
 * Truncate a string to at most `max` characters, appending "…" if truncated.
 * Mirrors the helper used in the PDF statement generator.
 */
export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/**
 * Driver payout from a fare total (85 % = 1 − PLATFORM_COMMISSION).
 */
export function driverPayout(fare: number): number {
  return Math.round(fare * (1 - PLATFORM_COMMISSION) * 100) / 100;
}
