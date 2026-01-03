import { z } from "zod";

export const StationSchema = z.object({
  id: z.string(),
  name: z.string(),
  terminalName: z.string(),
  lat: z.number(),
  long: z.number(),
  installed: z.boolean(),
  locked: z.boolean(),
  installDate: z.number().nullable(),
  removalDate: z.number().nullable(),
  temporary: z.boolean(),
  nbBikes: z.number(),
  nbStandardBikes: z.number(),
  nbEBikes: z.number(),
  nbEmptyDocks: z.number(),
  nbDocks: z.number(),
});

export const StationsArraySchema = z.array(StationSchema);

// Export TypeScript types inferred from Zod schemas
export type Station = z.infer<typeof StationSchema>;
