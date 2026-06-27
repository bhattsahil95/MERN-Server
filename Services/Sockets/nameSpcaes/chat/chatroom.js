const handleChatNamespace = (chatNamespace) => {
    // Array to store user information
    const chatUsers = [];
    const chatIdToSocketIdMap = new Map();

    //Array to store room information
    const rooms = [];

    //Methods for mainting room array

    const removeRoomById = (roomId) => {
        const indexToRemove = rooms.findIndex((room) => room.id === roomId);

        if (indexToRemove !== -1) {
            rooms.splice(indexToRemove, 1);
        }
    };

    chatNamespace.on("connection", (socket) => {
        console.log(`JOINED /chatroom ==> ${socket.id} `);

        socket.on("newChatUser", ({ userName, chatId }) => {
            const userData = { userName, chatId };
            chatUsers.push(userData);
            chatIdToSocketIdMap.set(chatId, socket.id); // Map
            chatNamespace.emit("userUpdate", {
                type: "add",
                who: userData,
                users: chatUsers,
            });

            if (rooms.length > 0) {
                socket.emit("roomUpdate", rooms);
            }
        });

        //1 on 1 chat request  from sender to receiver
        socket.on("sendChatRequest", ({ guest, host }) => {
            const userData = {
                guest: { id: guest.id, name: guest.name },
                host: { id: host.id, name: host.name },
            };
            const user2SocketId = chatIdToSocketIdMap.get(guest.id);

            if (user2SocketId) {
                chatNamespace
                    .to(user2SocketId)
                    .emit("receiveChatRequest", userData);
            } else {
                chatNamespace.to(socket.id).emit("failedChatRequest");
            }
        });

        // 1 on 1 chat request confirmation
        socket.on("confirmationResponse", (data) => {
            const { guestResponse, chatParty } = data;
            const { guest } = chatParty;
            const hostSocketId = chatIdToSocketIdMap.get(chatParty.host.id);

            if (guestResponse === "yes") {
                chatNamespace
                    .to(hostSocketId)
                    .emit("chatRequestAccept", { guest });
            } else {
                chatNamespace
                    .to(hostSocketId)
                    .emit("chatRequestDecline", { guest });
            }
        });

        //1 on 1 chatt features

        socket.on("chatLeft", (data) => {
            chatNamespace.to(chatIdToSocketIdMap.get(data.id)).emit("chatLeft");
        });

        socket.on("removeChatUser", ({ userName, chatId }) => {
            const index = chatUsers.findIndex(
                (user) => user.userName === userName && user.chatId === chatId
            );

            chatIdToSocketIdMap.delete(chatId); //Map

            if (index !== -1) {
                const removedUser = chatUsers.splice(index, 1)[0];
                chatNamespace.emit("userUpdate", {
                    type: "remove",
                    who: removedUser,
                    users: chatUsers,
                });
            }
        });

        socket.on("sendMessage", (data) => {
            chatNamespace
                .to(chatIdToSocketIdMap.get(data.receiver))
                .emit("receiveMessage", data);
        });

        socket.on("map-audit", ({ chatId }) => {
            chatIdToSocketIdMap.set(chatId, socket.id);

            chatNamespace.to(socket.id).emit("userUpdate", {
                type: "update",
                who: chatId,
                users: chatUsers,
            });

            console.log("audit");
        });

        socket.on("retriveChat", (guestId) => {
            chatNamespace
                .to(chatIdToSocketIdMap.get(guestId))
                .emit("restoreChat", guestId);
        });

        socket.on("updateRoom", (newRoom) => {
            socket.broadcast.emit("addRoom", newRoom);
            rooms.push(newRoom);
            console.log(rooms);
        });

        socket.on("deleteRoom", (roomId) => {
            socket.broadcast.emit("deleteRoom", roomId);
            removeRoomById(roomId);
            console.log(rooms);
        });

        socket.on("sendRoomMessage", (data) => {
            socket.broadcast.emit("receiveRoomMessage", data);
            console.log(data);
        });

        socket.on("disconnect", () => {
            console.log(`LEFT /chatroom ==> ${socket.id} `);
            for (let [k, v] of chatIdToSocketIdMap) {
                if (v === socket.id) {
                    chatIdToSocketIdMap.delete(k);
                }
            }
        });
    });
};
export default handleChatNamespace;
