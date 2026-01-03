import { z } from "zod";

export const PriceBreakdownItemSchema = z.object({
  title: z.string().nullable(),
  amount: z.string().nullable(),
});

export const PaymentMethodSchema = z.object({
  cardType: z.string().nullable().optional(),
  lastFour: z.string().nullable().optional(),
  clientPaymentMethod: z.string().nullable().optional(),
});

export const RideSchema = z.object({
  rideId: z.string().nullable(),
  startTimeMs: z.number().nullable(),
  endTimeMs: z.number().nullable(),
  startAddress: z.string().nullable(),
  endAddress: z.string().nullable(),
  price: z.string().nullable(),
  priceBreakdown: z.array(PriceBreakdownItemSchema).nullable(),
  paymentMethod: PaymentMethodSchema.nullable(),
});

export const RidesArraySchema = z.array(RideSchema);

// Export TypeScript types inferred from Zod schemas
export type Ride = z.infer<typeof RideSchema>;
export type PriceBreakdownItem = z.infer<typeof PriceBreakdownItemSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
