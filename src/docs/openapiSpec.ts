export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Slot Booking API",
    version: "1.0.0",
    description:
      "REST API for booking and cancelling time slots. This API has no authentication, all endpoints are publicly accessible. Real-time slot state changes are broadcast over Socket.IO; see README for Socket.IO details, which are not part of this HTTP specification.",
  },
  servers: [{ url: "http://localhost:3000" }],
  tags: [{ name: "Slots" }, { name: "Bookings" }],
  paths: {
    "/slots": {
      get: {
        tags: ["Slots"],
        summary: "List available time slots",
        description:
          "Returns time slots with no active booking. No parameters, no authentication.",
        responses: {
          "200": {
            description: "Available slots",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SlotListResponse" },
                example: {
                  slots: [
                    {
                      id: "11111111-1111-4111-8111-111111111111",
                      startsAt: "2026-10-01T09:00:00.000Z",
                      endsAt: "2026-10-01T09:30:00.000Z",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/bookings": {
      post: {
        tags: ["Bookings"],
        summary: "Create a booking for a slot",
        description:
          "Creates an active booking for the given slot. Fails with 409 if the slot already has an active booking.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBookingRequest" },
              example: {
                slotId: "11111111-1111-4111-8111-111111111111",
                customerName: "Jane Doe",
                customerEmail: "jane@example.com",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Booking created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookingResponse" },
                example: {
                  booking: {
                    id: "22222222-2222-4222-8222-222222222222",
                    slotId: "11111111-1111-4111-8111-111111111111",
                    customerName: "Jane Doe",
                    customerEmail: "jane@example.com",
                    status: "active",
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing/invalid fields or malformed JSON",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: {
                    code: "VALIDATION_ERROR",
                    message:
                      "The request payload has invalid/missing fields or malformed JSON.",
                  },
                },
              },
            },
          },
          "404": {
            description: "Slot does not exist",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: {
                    code: "SLOT_NOT_FOUND",
                    message: "The requested slot does not exist.",
                  },
                },
              },
            },
          },
          "409": {
            description: "Slot already has an active booking",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: {
                    code: "SLOT_UNAVAILABLE",
                    message: "This slot already has an active booking.",
                  },
                },
              },
            },
          },
          "500": {
            description: "Unexpected server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: {
                    code: "INTERNAL_ERROR",
                    message: "An unexpected error occurred on the server.",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/bookings/{bookingId}": {
      delete: {
        tags: ["Bookings"],
        summary: "Cancel a booking",
        description:
          "Marks a booking as cancelled and frees its slot. Calling this again on an already-cancelled booking is idempotent: returns 200 with the current (cancelled) booking and does not change state or broadcast again.",
        parameters: [
          {
            name: "bookingId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            example: "22222222-2222-4222-8222-222222222222",
          },
        ],
        responses: {
          "200": {
            description:
              "Booking cancelled (or already cancelled — idempotent)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookingResponse" },
                example: {
                  booking: {
                    id: "22222222-2222-4222-8222-222222222222",
                    slotId: "11111111-1111-4111-8111-111111111111",
                    customerName: "Jane Doe",
                    customerEmail: "jane@example.com",
                    status: "cancelled",
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid bookingId format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: {
                    code: "VALIDATION_ERROR",
                    message:
                      "The request payload has invalid/missing fields or malformed JSON.",
                  },
                },
              },
            },
          },
          "404": {
            description: "Booking does not exist",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: {
                    code: "BOOKING_NOT_FOUND",
                    message: "The requested booking does not exist.",
                  },
                },
              },
            },
          },
          "500": {
            description: "Unexpected server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: {
                    code: "INTERNAL_ERROR",
                    message: "An unexpected error occurred on the server.",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Slot: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          startsAt: { type: "string", format: "date-time" },
          endsAt: { type: "string", format: "date-time" },
        },
        required: ["id", "startsAt", "endsAt"],
      },
      SlotListResponse: {
        type: "object",
        properties: {
          slots: {
            type: "array",
            items: { $ref: "#/components/schemas/Slot" },
          },
        },
        required: ["slots"],
      },
      CreateBookingRequest: {
        type: "object",
        properties: {
          slotId: { type: "string", format: "uuid" },
          customerName: { type: "string", minLength: 1 },
          customerEmail: { type: "string", format: "email" },
        },
        required: ["slotId", "customerName", "customerEmail"],
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          slotId: { type: "string", format: "uuid" },
          customerName: { type: "string" },
          customerEmail: { type: "string", format: "email" },
          status: { type: "string", enum: ["active", "cancelled"] },
        },
        required: ["id", "slotId", "customerName", "customerEmail", "status"],
      },
      BookingResponse: {
        type: "object",
        properties: { booking: { $ref: "#/components/schemas/Booking" } },
        required: ["booking"],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
    },
  },
};
