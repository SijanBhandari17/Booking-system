import type { ErrorRequestHandler } from "express";
import { AppError, InternalServerError } from "../error/Error.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  const internalError = new InternalServerError();

  return res.status(500).json({
    error: {
      code: internalError.code,
      message: internalError.message,
    },
  });
};
