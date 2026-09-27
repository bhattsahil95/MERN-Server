// Scope: broadcasts collaborative note changes and live-user counts.

const handleNotesNamespace = (notesNamespace) => {
    notesNamespace.on("connection", (socket) => {
        console.log(`JOINED /mern-notes ==> ${socket.id} `);
        notesNamespace.emit('userCount', notesNamespace.sockets.size);

        socket.on("message", () => {
            socket.broadcast.emit("message", "Client: Message .");
        });
        socket.on("newNote", () => {
            socket.broadcast.emit("updatePage", "Someone added a note.");
        });

        socket.on("archiveNote", () => {
            socket.broadcast.emit("updatePage", "Someone archived a note.");
        });

        socket.on("updateNote", () => {
            socket.broadcast.emit("updatePage", "Someone updated a note.");
        });

        socket.on("testJoin", () => {
            socket.broadcast.emit("testerJoin");
        });

        socket.on("disconnect", () => {
            notesNamespace.emit('userCount', notesNamespace.sockets.size);
            console.log(`LEFT /mern-notes ==> ${socket.id} `);
        });
    });
};

export default handleNotesNamespace;
