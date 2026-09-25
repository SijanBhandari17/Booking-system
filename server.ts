import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./src/socket.js";

const httpServer = createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
