import { describe, it, expect } from "vitest";
import {
  insertUserSchema,
  insertTripSchema,
  insertSavedPlaceSchema,
  insertVehicleTypeSchema,
  insertTaxiRouteSchema,
  insertMessageSchema,
  insertSosAlertSchema,
  insertSupportTicketSchema,
  insertSupportMessageSchema,
} from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function validUser(overrides = {}) {
  return {
    username: "testuser",
    password: "secret123",
    fullName: "Test User",
    phone: "0821234567",
    role: "rider" as const,
    ...overrides,
  };
}

function validTrip(overrides = {}) {
  return {
    riderId: "rider-uuid-1",
    rideType: "private" as const,
    pickupName: "Masingita Mall",
    dropoffName: "Giyani CBD",
    status: "requested" as const,
    fare: 45,
    paymentMethod: "cash" as const,
    vehicleType: "standard",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// insertUserSchema
// ---------------------------------------------------------------------------
describe("insertUserSchema", () => {
  it("accepts a valid minimal user", () => {
    const result = insertUserSchema.safeParse(validUser());
    expect(result.success).toBe(true);
  });

  it("rejects missing username", () => {
    const result = insertUserSchema.safeParse(validUser({ username: undefined }));
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = insertUserSchema.safeParse(validUser({ password: undefined }));
    expect(result.success).toBe(false);
  });

  it("rejects missing fullName", () => {
    const result = insertUserSchema.safeParse(validUser({ fullName: undefined }));
    expect(result.success).toBe(false);
  });

  it("rejects missing phone", () => {
    const result = insertUserSchema.safeParse(validUser({ phone: undefined }));
    expect(result.success).toBe(false);
  });

  it("accepts optional nullable fields as undefined", () => {
    const result = insertUserSchema.safeParse(validUser({ avatarUrl: undefined, email: undefined }));
    expect(result.success).toBe(true);
  });

  it("accepts all valid role values", () => {
    for (const role of ["rider", "driver", "admin"] as const) {
      const result = insertUserSchema.safeParse(validUser({ role }));
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid role", () => {
    const result = insertUserSchema.safeParse(validUser({ role: "superuser" }));
    expect(result.success).toBe(false);
  });

  it("accepts valid approvalStatus values", () => {
    for (const s of ["pending", "approved", "rejected"] as const) {
      const result = insertUserSchema.safeParse(validUser({ approvalStatus: s }));
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid approvalStatus", () => {
    const result = insertUserSchema.safeParse(validUser({ approvalStatus: "banned" }));
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// insertTripSchema
// ---------------------------------------------------------------------------
describe("insertTripSchema", () => {
  it("accepts a valid minimal trip", () => {
    const result = insertTripSchema.safeParse(validTrip());
    expect(result.success).toBe(true);
  });

  it("rejects missing riderId", () => {
    const result = insertTripSchema.safeParse(validTrip({ riderId: undefined }));
    expect(result.success).toBe(false);
  });

  it("rejects missing pickupName", () => {
    const result = insertTripSchema.safeParse(validTrip({ pickupName: undefined }));
    expect(result.success).toBe(false);
  });

  it("rejects missing dropoffName", () => {
    const result = insertTripSchema.safeParse(validTrip({ dropoffName: undefined }));
    expect(result.success).toBe(false);
  });

  it("rejects missing fare", () => {
    const result = insertTripSchema.safeParse(validTrip({ fare: undefined }));
    expect(result.success).toBe(false);
  });

  it("accepts all valid trip status values", () => {
    for (const status of ["requested", "accepted", "arriving", "in_progress", "completed", "cancelled"] as const) {
      const result = insertTripSchema.safeParse(validTrip({ status }));
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid trip status", () => {
    const result = insertTripSchema.safeParse(validTrip({ status: "unknown" }));
    expect(result.success).toBe(false);
  });

  it("accepts all valid paymentMethod values", () => {
    for (const method of ["cash", "card", "ewallet", "eft"] as const) {
      const result = insertTripSchema.safeParse(validTrip({ paymentMethod: method }));
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid paymentMethod", () => {
    const result = insertTripSchema.safeParse(validTrip({ paymentMethod: "bitcoin" }));
    expect(result.success).toBe(false);
  });

  it("accepts all valid rideType values", () => {
    for (const rt of ["private", "shared", "taxi", "parcel", "medical"] as const) {
      const result = insertTripSchema.safeParse(validTrip({ rideType: rt }));
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid rideType", () => {
    const result = insertTripSchema.safeParse(validTrip({ rideType: "helicopter" }));
    expect(result.success).toBe(false);
  });

  it("accepts optional coordinates", () => {
    const result = insertTripSchema.safeParse(
      validTrip({ pickupLat: -23.315, pickupLng: 30.726, dropoffLat: -23.31, dropoffLng: 30.69 }),
    );
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// insertSavedPlaceSchema
// ---------------------------------------------------------------------------
describe("insertSavedPlaceSchema", () => {
  const validPlace = {
    userId: "user-uuid-1",
    name: "Home",
    address: "Section A, Giyani",
  };

  it("accepts a valid saved place", () => {
    expect(insertSavedPlaceSchema.safeParse(validPlace).success).toBe(true);
  });

  it("rejects missing userId", () => {
    expect(insertSavedPlaceSchema.safeParse({ ...validPlace, userId: undefined }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(insertSavedPlaceSchema.safeParse({ ...validPlace, name: undefined }).success).toBe(false);
  });

  it("rejects missing address", () => {
    expect(insertSavedPlaceSchema.safeParse({ ...validPlace, address: undefined }).success).toBe(false);
  });

  it("accepts optional lat/lng", () => {
    expect(insertSavedPlaceSchema.safeParse({ ...validPlace, lat: -23.306, lng: 30.718 }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// insertVehicleTypeSchema
// ---------------------------------------------------------------------------
describe("insertVehicleTypeSchema", () => {
  const validVT = {
    name: "GY Standard",
    basePrice: 10,
    pricePerKm: 8,
    pricePerMin: 1.5,
    minimumFare: 25,
    seats: 4,
  };

  it("accepts a valid vehicle type", () => {
    expect(insertVehicleTypeSchema.safeParse(validVT).success).toBe(true);
  });

  it("rejects missing name", () => {
    expect(insertVehicleTypeSchema.safeParse({ ...validVT, name: undefined }).success).toBe(false);
  });

  it("rejects missing basePrice", () => {
    expect(insertVehicleTypeSchema.safeParse({ ...validVT, basePrice: undefined }).success).toBe(false);
  });

  it("rejects missing pricePerKm", () => {
    expect(insertVehicleTypeSchema.safeParse({ ...validVT, pricePerKm: undefined }).success).toBe(false);
  });

  it("accepts a missing seats field (it has a database default of 4)", () => {
    // drizzle-zod makes columns with a .default() optional in insert schemas
    const { seats: _seats, ...noSeats } = validVT;
    expect(insertVehicleTypeSchema.safeParse(noSeats).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// insertTaxiRouteSchema
// ---------------------------------------------------------------------------
describe("insertTaxiRouteSchema", () => {
  const validRoute = {
    routeName: "Giyani – Masingita Mall",
    fromLocation: "Giyani Taxi Rank",
    toLocation: "Masingita Mall",
    fare: 15,
    totalSeats: 15,
    availableSeats: 8,
  };

  it("accepts a valid taxi route", () => {
    expect(insertTaxiRouteSchema.safeParse(validRoute).success).toBe(true);
  });

  it("rejects missing routeName", () => {
    expect(insertTaxiRouteSchema.safeParse({ ...validRoute, routeName: undefined }).success).toBe(false);
  });

  it("rejects missing fromLocation", () => {
    expect(insertTaxiRouteSchema.safeParse({ ...validRoute, fromLocation: undefined }).success).toBe(false);
  });

  it("rejects missing toLocation", () => {
    expect(insertTaxiRouteSchema.safeParse({ ...validRoute, toLocation: undefined }).success).toBe(false);
  });

  it("rejects missing fare", () => {
    expect(insertTaxiRouteSchema.safeParse({ ...validRoute, fare: undefined }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// insertMessageSchema
// ---------------------------------------------------------------------------
describe("insertMessageSchema", () => {
  const validMsg = {
    tripId: "trip-uuid-1",
    senderId: "user-uuid-1",
    senderRole: "rider" as const,
    text: "On my way!",
  };

  it("accepts a valid message", () => {
    expect(insertMessageSchema.safeParse(validMsg).success).toBe(true);
  });

  it("rejects missing text", () => {
    expect(insertMessageSchema.safeParse({ ...validMsg, text: undefined }).success).toBe(false);
  });

  it("rejects missing tripId", () => {
    expect(insertMessageSchema.safeParse({ ...validMsg, tripId: undefined }).success).toBe(false);
  });

  it("accepts all valid sender roles", () => {
    for (const role of ["rider", "driver", "admin"] as const) {
      expect(insertMessageSchema.safeParse({ ...validMsg, senderRole: role }).success).toBe(true);
    }
  });

  it("rejects an invalid senderRole", () => {
    expect(insertMessageSchema.safeParse({ ...validMsg, senderRole: "passenger" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// insertSosAlertSchema
// ---------------------------------------------------------------------------
describe("insertSosAlertSchema", () => {
  const validSos = {
    userId: "user-uuid-1",
    userRole: "rider" as const,
    status: "active" as const,
  };

  it("accepts a valid SOS alert", () => {
    expect(insertSosAlertSchema.safeParse(validSos).success).toBe(true);
  });

  it("rejects missing userId", () => {
    expect(insertSosAlertSchema.safeParse({ ...validSos, userId: undefined }).success).toBe(false);
  });

  it("rejects missing userRole", () => {
    expect(insertSosAlertSchema.safeParse({ ...validSos, userRole: undefined }).success).toBe(false);
  });

  it("accepts valid status values", () => {
    for (const status of ["active", "acknowledged", "resolved"] as const) {
      expect(insertSosAlertSchema.safeParse({ ...validSos, status }).success).toBe(true);
    }
  });

  it("rejects an invalid status", () => {
    expect(insertSosAlertSchema.safeParse({ ...validSos, status: "closed" }).success).toBe(false);
  });

  it("accepts optional lat/lng", () => {
    expect(insertSosAlertSchema.safeParse({ ...validSos, lat: -23.315, lng: 30.726 }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// insertSupportTicketSchema
// ---------------------------------------------------------------------------
describe("insertSupportTicketSchema", () => {
  const validTicket = {
    userId: "user-uuid-1",
    userRole: "rider" as const,
    subject: "Payment issue",
    category: "payment" as const,
    status: "open" as const,
    priority: "normal",
  };

  it("accepts a valid support ticket", () => {
    expect(insertSupportTicketSchema.safeParse(validTicket).success).toBe(true);
  });

  it("rejects missing subject", () => {
    expect(insertSupportTicketSchema.safeParse({ ...validTicket, subject: undefined }).success).toBe(false);
  });

  it("accepts all valid category values", () => {
    for (const cat of ["general", "payment", "trip", "safety", "account", "driver", "other"] as const) {
      expect(insertSupportTicketSchema.safeParse({ ...validTicket, category: cat }).success).toBe(true);
    }
  });

  it("rejects an invalid category", () => {
    expect(insertSupportTicketSchema.safeParse({ ...validTicket, category: "billing" }).success).toBe(false);
  });

  it("accepts all valid ticket status values", () => {
    for (const status of ["open", "in_progress", "resolved", "closed"] as const) {
      expect(insertSupportTicketSchema.safeParse({ ...validTicket, status }).success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// insertSupportMessageSchema
// ---------------------------------------------------------------------------
describe("insertSupportMessageSchema", () => {
  const validSupportMsg = {
    ticketId: "ticket-uuid-1",
    senderId: "user-uuid-1",
    senderRole: "rider" as const,
    content: "Please help me.",
    readByAdmin: false,
    readByUser: false,
  };

  it("accepts a valid support message", () => {
    expect(insertSupportMessageSchema.safeParse(validSupportMsg).success).toBe(true);
  });

  it("rejects missing content", () => {
    expect(insertSupportMessageSchema.safeParse({ ...validSupportMsg, content: undefined }).success).toBe(false);
  });

  it("rejects missing ticketId", () => {
    expect(insertSupportMessageSchema.safeParse({ ...validSupportMsg, ticketId: undefined }).success).toBe(false);
  });

  it("accepts senderRole=admin", () => {
    expect(insertSupportMessageSchema.safeParse({ ...validSupportMsg, senderRole: "admin" }).success).toBe(true);
  });
});
