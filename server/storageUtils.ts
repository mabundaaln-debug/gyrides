/**
 * Pure utility functions extracted from the server storage layer so they can
 * be unit-tested without a real database connection.
 */

/**
 * Given a trip ID and a status being applied, return the timestamp fields that
 * should be written to the database.  Mirrors the logic in
 * `DatabaseStorage.updateTrip`.
 */
export function resolveTimestamps(
  status: string | undefined,
  existing: { startedAt?: string | Date | null; completedAt?: string | Date | null },
): { startedAt?: Date; completedAt?: Date } {
  // Mirror the exact logic in DatabaseStorage.updateTrip:
  // 1. Spread the incoming data
  // 2. Status-driven timestamps take priority (they overwrite whatever was in data)
  // 3. Finally, convert any remaining string timestamps to Dates
  const updateData: { startedAt?: string | Date | null; completedAt?: string | Date | null } = {
    ...existing,
  };

  if (status === "in_progress") {
    updateData.startedAt = new Date();
  }
  if (status === "completed") {
    updateData.completedAt = new Date();
  }

  const out: { startedAt?: Date; completedAt?: Date } = {};

  if (updateData.startedAt && typeof updateData.startedAt === "string") {
    out.startedAt = new Date(updateData.startedAt);
  } else if (updateData.startedAt instanceof Date) {
    out.startedAt = updateData.startedAt;
  }

  if (updateData.completedAt && typeof updateData.completedAt === "string") {
    out.completedAt = new Date(updateData.completedAt);
  } else if (updateData.completedAt instanceof Date) {
    out.completedAt = updateData.completedAt;
  }

  return out;
}

/**
 * Determine whether any trip in `allTrips` matches the given suffix.
 * Mirrors the logic in `DatabaseStorage.getTripByCodeSuffix`.
 */
export function findTripByCodeSuffix<T extends { id: string }>(
  allTrips: T[],
  suffix: string,
): T | undefined {
  const lower = suffix.toLowerCase();
  return allTrips.find((t) =>
    t.id.replace(/-/g, "").toLowerCase().endsWith(lower),
  );
}
