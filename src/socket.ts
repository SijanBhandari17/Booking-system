import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { SlotEvent } from "./types/slotevent.types.js";

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer);
  return io;
}

export function broadcastSlotEvent(
  eventName: string,
  { slotId, bookingId, available }: SlotEvent,
): void {
  if (!io) {
    return;
  }

  io.emit(eventName, {
    slotId,
    bookingId,
    available,
  });
}
