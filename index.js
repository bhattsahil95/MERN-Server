// Scope: configures the portfolio HTTP and Socket.IO server entry point.

// Package imports
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import mongoose from "mongoose";

//File Imports
import { testRouter } from "./Routes/Test.js";
import { noteRouter } from "./Routes/Note.js";
import { contactRouter } from "./Routes/Contact.js";
import { chatRoute } from "./Routes/chat.js";
import { weatherRouter } from "./Routes/Weather.js";
import beginDB from "./Models/TestBegin.js";
import beginDBTest from "./Models/NoteModel.js";
import createSocketServer from "./Services/Sockets/socket.js";
import { instrument } from "@socket.io/admin-ui";
import { corsOptions, isProduction } from "./config/security.js";

// Express app Setup
const app = express();
const ServerPort = process.env.PORT || 5500; // Use environment variable PORT if available, otherwise use 5500 // Only to be used in the development. Shall be replaced in the production with .env
app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
app.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
});

// HTTP Server Connection
const httpServer = createServer(app);

// Socket server connection
const io = createSocketServer(httpServer);

// The unauthenticated Socket.IO admin console is development-only.
if (!isProduction) {
    instrument(io, {
        auth: false,
        mode: "development",
        namespaceName: "/admin",
    });
}

//mongoDB Connection
beginDB();
if (!isProduction) beginDBTest();

// API Routers
app.get("/", function (req, res) {
    res.json({ ok: true, message: "API is active." });
});

app.get("/health", function (req, res) {
    res.json({ ok: true, service: "server", timestamp: new Date().toISOString() });
});

app.get("/health/notes", function (req, res) {
    const databaseReady = mongoose.connection.readyState === 1;
    res.status(databaseReady ? 200 : 503).json({
        ok: databaseReady,
        service: "notes",
        database: databaseReady ? "ready" : "connecting",
        timestamp: new Date().toISOString(),
    });
});

app.use("/test", testRouter);
app.use("/note", noteRouter);
app.use("/contact", contactRouter);
app.use("/chat", chatRoute);
app.use("/weather", weatherRouter);

//Start Express App
httpServer.listen(ServerPort, () => {
    console.log(`
  ╔═════════════════════════════════════════╗
  ║    BACKEND SERVER is LIVE. PORT:${ServerPort}    ║
  ╚═════════════════════════════════════════╝
`);
});

export { io };
