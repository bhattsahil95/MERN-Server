import { Server } from "socket.io";

const createSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
        cors: { origin: "https://sahil-bhatt.onrender.com" },
    });

    io.on("connection", (socket) => {
        console.log(`Latest User Connected: id=${socket.id}`);
        socket.broadcast.emit("message", "A new User has joined ");

        socket.on("newNote", () => {
            socket.broadcast.emit("updatePage", "Someone add a note.");
        });

        socket.on("deleteNote", () => {
            socket.broadcast.emit("updatePage", "Someone deleted a note.");
        });

        socket.on("updateNote", () => {
            socket.broadcast.emit("updatePage", "Someone updated a note.");
        });

        socket.on("disconnect", () => {
            console.log(`User Disconnected: ${socket.id}`);
        });
    });

    return io;
};

export default createSocketServer;
