-- This is an empty migration.
CREATE UNIQUE INDEX one_active_booking_per_slot
ON bookings ("timeSlotId")
WHERE status = 'active';
