import { ZodSchema } from "zod";
import { ValidationError } from "../error/Error.js";

export function validateSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError();
  }
  return result.data;
}
