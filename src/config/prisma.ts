import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/index.js";

const databaseString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({
  connectionString: databaseString,
  max: 10,
});

const prisma = new PrismaClient({
  adapter,
});

export { prisma };
