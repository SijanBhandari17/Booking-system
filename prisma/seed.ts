import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.bookings.deleteMany();
  await prisma.time_slots.deleteMany();

  const baseDate = new Date("2030-01-15T09:00:00.000Z");

  const slotDefs = Array.from({ length: 6 }).map((_, i) => {
    const startsAt = new Date(baseDate.getTime() + i * 30 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
    return { startsAt, endsAt };
  });

  const slots = await Promise.all(
    slotDefs.map((s) => prisma.time_slots.create({ data: s })),
  );

  const [firstSlot] = slots;
  const existingBooking = await prisma.bookings.create({
    data: {
      timeSlotId: firstSlot.id,
      customerName: "Alex Ferguson",
      customerEmail: "alexfer@example.com",
      status: "active",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
