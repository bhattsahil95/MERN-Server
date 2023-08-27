// PAckage Imports
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { config } from "dotenv";
import createSocketServer from "./socket.js";

//File Imports
import { testRouter } from "./Routes/Test.js";
import { noteRouter } from "./Routes/Note.js";
import { contactRouter } from "./Routes/Contact.js";
import beginDB from "./Models/TestBegin.js";
import beginDBTest from "./Models/NoteModel.js";
import { createServer } from "http";

//Configuration
config();

// Express app Setup
const app = express();
const ServerPort = process.env.PORT || 5500; // Use environment variable PORT if available, otherwise use 5500 // Only to be used in the development. Shall be replaced in the production with .env
app.use(express.json());
app.use(cors());

//Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// HTTP Server Connection
const httpServer = createServer(app);

// Socket server connection
const io = createSocketServer(httpServer);

//mongoDB Connection
beginDB();
beginDBTest();

// API Routers
app.get("/", function (req, res) {
    res.send("Active! Sahil ");
});

app.use("/test", testRouter);
app.use("/note", noteRouter);
app.use("/contact", contactRouter);

//Start Express App
httpServer.listen(ServerPort, () => {
    console.log(`Started Express app on port ${ServerPort} `);
});

export { io };
