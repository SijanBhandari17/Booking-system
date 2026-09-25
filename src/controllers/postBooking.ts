import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { Response, Request } from "express";
import { validateSchema } from "../utils/validateSchema.js";
import { bookingSchema } from "../validations/booking.validation.js";
import { SlotNotFoundError, SlotUnavailableError } from "../error/Error.js";
import { isUniqueConstraintViolation } from "../error/dberror.js";
import { broadcastSlotEvent } from "../socket.js";

const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const { slotId, customerName, customerEmail } = validateSchema(
    bookingSchema,
    req.body,
  );

  const slot = await prisma.time_slots.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    throw new SlotNotFoundError();
  }

  try {
    const booking = await prisma.bookings.create({
      data: {
        timeSlotId: slotId,
        customerName,
        customerEmail,
        status: "active",
      },
    });

    //emit
    broadcastSlotEvent("slot.booked", {
      slotId: booking.timeSlotId,
      bookingId: booking.id,
      available: false,
    });

    res.status(201).json({
      booking: {
        id: booking.id,
        slotId: booking.timeSlotId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        status: booking.status,
      },
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new SlotUnavailableError();
    }
    throw err;
  }
});

export { createBooking };
