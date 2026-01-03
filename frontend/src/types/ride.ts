// Types for ride data from Santander Cycle API

export interface RideSummary {
  rideId: string;
  startTimeMs: string;
  endTimeMs: string;
  duration: number;
  rideableName?: string;
  price?: {
    formatted: string;
  };
}

// Main Ride type is now inferred from Zod schema in schemas/ride.ts
// Re-export for convenience
export type { Ride, PriceBreakdownItem, PaymentMethod } from "../schemas/ride";
