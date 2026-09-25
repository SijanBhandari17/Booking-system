import { z } from "zod";

export const bookingSchema = z.object({
  slotId: z.string().trim().uuid("Invalid slotid format"),
  customerName: z.string().trim().min(1, "Customer name is required"),
  customerEmail: z.string().trim().email("Invalid email format"),
});

export const bookingUUIDSchema = z.object({
  id: z.string().trim().uuid("Invalid bookingId format"),
});

export type BookingRequestPayload = z.infer<typeof bookingSchema>;
export type BookingIDPayload = z.infer<typeof bookingSchema>;
