// Socket Connection Entry Point

import { Server } from "socket.io";
import handleTestNamespace from "./nameSpcaes/test.js";
import handleNotesNamespace from "./nameSpcaes/mern-notes.js";
import handleChatNamespace from "./nameSpcaes/chat/chatroom.js";
import { allowedOrigins, isProduction } from "../../config/security.js";

const createSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: isProduction
                ? allowedOrigins
                : [...allowedOrigins, "https://admin.socket.io"],
            credentials: true,
        },
        maxHttpBufferSize: 64 * 1024,
        pingInterval: 25_000,
        pingTimeout: 20_000,
    });

    io.on("connection", (socket) => {
        console.log(`JOINED THE GENERAL POOL ==> ${socket.id}`);
        socket.broadcast.emit(
            "user",
            "Some else is using this website as well! "
        );

        socket.on("disconnect", () => {
            console.log(`LEFT THE GENERAL POOL ==> ${socket.id}`);
        });
    });

    // Set up a namespaces
    const testNamespace = io.of("/test");
    const chatNameSpace = io.of("/chatroom");
    const notesNameSpace = io.of("/mern-notes");
    // Event handling for the "connection" event in the "test" namespace
    handleTestNamespace(testNamespace);
    handleNotesNamespace(notesNameSpace);
    handleChatNamespace(chatNameSpace);

    return io;
};

export default createSocketServer;
