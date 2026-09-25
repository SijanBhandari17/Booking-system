import express from "express";
import slotsRouter from "./src/routes/slots.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { apiReference } from "@scalar/express-api-reference";
import { openapiSpec } from "./src/docs/openapiSpec.js";

const app = express();
app.use(express.json());

app.use(slotsRouter);
app.get("/openapi.json", (req, res) => res.json(openapiSpec));
app.use("/docs", apiReference({ spec: { url: "/openapi.json" } }));
app.use(errorHandler);

export default app;
