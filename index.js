// PAckage Imports
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { config } from "dotenv";
import { createServer } from "http";

//File Imports
import { testRouter } from "./Routes/Test.js";
import { noteRouter } from "./Routes/Note.js";
import { contactRouter } from "./Routes/Contact.js";
import { chatRoute } from "./Routes/chat.js";
import beginDB from "./Models/TestBegin.js";
import beginDBTest from "./Models/NoteModel.js";
import createSocketServer from "./Services/Sockets/socket.js";
import { instrument } from "@socket.io/admin-ui";
//Configuration
config();

// Express app Setup
const app = express();
const ServerPort = process.env.PORT || 5500; // Use environment variable PORT if available, otherwise use 5500 // Only to be used in the development. Shall be replaced in the production with .env
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

//Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// HTTP Server Connection
const httpServer = createServer(app);

// Socket server connection
const io = createSocketServer(httpServer);

//Connecting to Socket.io admin UI
instrument(io, {
    auth: false,
    mode: "development",
    namespaceName: "/admin",
});

//mongoDB Connection
beginDB();
beginDBTest();

// API Routers
app.get("/", function (req, res) {
    res.json({ ok: true, message: "API is active." });
});

app.get("/health", function (req, res) {
    res.json({ ok: true, service: "server", timestamp: new Date().toISOString() });
});

app.use("/test", testRouter);
app.use("/note", noteRouter);
app.use("/contact", contactRouter);
app.use("/chat", chatRoute);

//Start Express App
httpServer.listen(ServerPort, () => {
    console.log(`
  ╔═════════════════════════════════════════╗
  ║    BACKEND SERVER is LIVE. PORT:${ServerPort}    ║
  ╚═════════════════════════════════════════╝
`);
});

export { io };
