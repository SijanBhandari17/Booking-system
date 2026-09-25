import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => console.log("Connected:", socket.id));
socket.on("slot.booked", (data) => console.log("slot.booked:", data));
socket.on("slot.released", (data) => console.log("slot.released:", data));
socket.on("disconnect", () => console.log("Disconnected"));
