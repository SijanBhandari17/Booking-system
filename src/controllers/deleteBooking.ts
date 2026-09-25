import { prisma } from "../config/prisma.js";
import { BookingNotFoundError } from "../error/Error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { Response, Request } from "express";
import { validateSchema } from "../utils/validateSchema.js";
import { bookingUUIDSchema } from "../validations/booking.validation.js";
import { Booking } from "../types/booking.types.js";
import { broadcastSlotEvent } from "../socket.js";

function toBookingResponse(booking: Booking) {
  return {
    id: booking.id,
    slotId: booking.timeSlotId,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    status: booking.status,
  };
}

export const deleteBookingSlots = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(bookingUUIDSchema, req.params);

    const booking = await prisma.bookings.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new BookingNotFoundError();
    }

    if (booking.status === "cancelled") {
      res.status(200).json({ booking: toBookingResponse(booking) });
      return;
    }

    const bookingData = await prisma.bookings.update({
      where: { id },
      data: {
        status: "cancelled",
      },
    });

    broadcastSlotEvent("slot.released", {
      slotId: bookingData.timeSlotId,
      bookingId: bookingData.id,
      available: true,
    });

    res.status(200).json({ booking: toBookingResponse(bookingData) });
  },
);
