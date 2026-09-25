import { Router } from "express";
import { getAvailableSlots } from "../controllers/getSlots.js";
import { createBooking } from "../controllers/postBooking.js";
import { deleteBookingSlots } from "../controllers/deleteBooking.js";

const router = Router();
router.get("/slots", getAvailableSlots);
router.post("/bookings", createBooking);
router.delete("/bookings/:id", deleteBookingSlots);

export default router;
