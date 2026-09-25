export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor() {
    super(
      "VALIDATION_ERROR",
      "The request payload has invalid/missing fields or malformed JSON.",
      400,
    );
  }
}

export class SlotUnavailableError extends AppError {
  constructor() {
    super("SLOT_UNAVAILABLE", "This slot already has an active booking.", 409);
  }
}

export class SlotNotFoundError extends AppError {
  constructor() {
    super("SLOT_NOT_FOUND", "The requested slot does not exist.", 404);
  }
}

export class BookingNotFoundError extends AppError {
  constructor() {
    super("BOOKING_NOT_FOUND", "The requested booking does not exist.", 404);
  }
}

export class InternalServerError extends AppError {
  constructor() {
    super("INTERNAL_ERROR", "An unexpected error occurred on the server.", 500);
  }
}
