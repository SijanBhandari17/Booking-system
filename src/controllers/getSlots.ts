import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { Response, Request } from "express";

const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const available_slots = await prisma.time_slots.findMany({
    where: {
      bookings: {
        none: { status: "active" },
      },
    },
    orderBy: [
      {
        startsAt: "asc",
      },
      { id: "asc" },
    ],
  });
  res.status(200).json({ slots: available_slots });
});

export { getAvailableSlots };
