import { Prisma } from "../../generated/prisma/client.js";

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}
export { isUniqueConstraintViolation };
