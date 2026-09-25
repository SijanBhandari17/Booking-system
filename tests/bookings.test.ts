import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import app from "../app.js";
import { prisma } from "../src/config/prisma.js";

const createdSlotIds: string[] = [];

async function createSlot() {
  const slot = await prisma.time_slots.create({
    data: {
      id: randomUUID(),
      startsAt: new Date(Date.now() + 3_600_000),
      endsAt: new Date(Date.now() + 7_200_000),
    },
  });
  createdSlotIds.push(slot.id);
  return slot;
}

afterAll(async () => {
  await prisma.bookings.deleteMany({
    where: { timeSlotId: { in: createdSlotIds } },
  });
  await prisma.time_slots.deleteMany({ where: { id: { in: createdSlotIds } } });
  await prisma.$disconnect();
});

describe("POST /bookings", () => {
  it("1. returns 201 and removes the slot from availability", async () => {
    const slot = await createSlot();

    const res = await request(app).post("/bookings").send({
      slotId: slot.id,
      customerName: "Test User",
      customerEmail: "test@example.com",
    });

    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe("active");

    const slotsRes = await request(app).get("/slots");
    expect(slotsRes.body.slots.map((s: { id: string }) => s.id)).not.toContain(
      slot.id,
    );
  });

  it("2. two overlapping requests for one slot return one 201 and one 409; exactly one active booking persists", async () => {
    const slot = await createSlot();
    const payload = {
      slotId: slot.id,
      customerName: "Racer",
      customerEmail: "racer@example.com",
    };

    const [resA, resB] = await Promise.all([
      request(app).post("/bookings").send(payload),
      request(app).post("/bookings").send(payload),
    ]);

    expect([resA.status, resB.status].sort()).toEqual([201, 409]);

    const activeBookings = await prisma.bookings.findMany({
      where: { timeSlotId: slot.id, status: "active" },
    });
    expect(activeBookings).toHaveLength(1);
  });
});

describe("DELETE /bookings/:bookingId", () => {
  it("3. cancellation returns 200, restores availability, and permits a new booking", async () => {
    const slot = await createSlot();

    const bookRes = await request(app).post("/bookings").send({
      slotId: slot.id,
      customerName: "Test User",
      customerEmail: "test@example.com",
    });
    const bookingId = bookRes.body.booking.id;

    const cancelRes = await request(app).delete(`/bookings/${bookingId}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.booking.status).toBe("cancelled");

    const slotsRes = await request(app).get("/slots");
    expect(slotsRes.body.slots.map((s: { id: string }) => s.id)).toContain(
      slot.id,
    );

    const rebookRes = await request(app).post("/bookings").send({
      slotId: slot.id,
      customerName: "New Customer",
      customerEmail: "new@example.com",
    });
    expect(rebookRes.status).toBe(201);
  });

  it("repeated cancellation returns 200 without a further state change", async () => {
    const slot = await createSlot();
    const bookRes = await request(app).post("/bookings").send({
      slotId: slot.id,
      customerName: "Test User",
      customerEmail: "test@example.com",
    });
    const bookingId = bookRes.body.booking.id;

    await request(app).delete(`/bookings/${bookingId}`);
    const second = await request(app).delete(`/bookings/${bookingId}`);

    expect(second.status).toBe(200);
    expect(second.body.booking.status).toBe("cancelled");
  });
});
