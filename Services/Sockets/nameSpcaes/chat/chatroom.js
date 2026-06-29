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
            const existingIndex = chatUsers.findIndex((entry) => entry.chatId === chatId);

            if (existingIndex !== -1) {
                chatUsers[existingIndex] = userData;
            } else {
                chatUsers.push(userData);
            }

            socket.data = { ...socket.data, chatId, userName };
            chatIdToSocketIdMap.set(chatId, socket.id);
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
            const { host, guest } = chatParty;
            const hostSocketId = chatIdToSocketIdMap.get(host.id);
            const guestSocketId = chatIdToSocketIdMap.get(guest.id);

            if (guestResponse === "yes") {
                if (hostSocketId) {
                    chatNamespace.to(hostSocketId).emit("chatRequestAccept", { host, guest });
                }
                if (guestSocketId) {
                    chatNamespace.to(guestSocketId).emit("chatRequestAccepted", { host, guest });
                }
                socket.data = { ...socket.data, activeChatWith: host.id };
                const hostSocket = chatNamespace.sockets.get(hostSocketId);
                if (hostSocket) {
                    hostSocket.data = { ...hostSocket.data, activeChatWith: guest.id };
                }
            } else {
                if (hostSocketId) {
                    chatNamespace.to(hostSocketId).emit("chatRequestDecline", { guest });
                }
            }
        });

        //1 on 1 chatt features

        socket.on("chatLeft", (data) => {
            const otherSocketId = chatIdToSocketIdMap.get(data.id);
            if (otherSocketId) {
                chatNamespace.to(otherSocketId).emit("chatLeft");
            }
            socket.data = { ...socket.data, activeChatWith: null };
        });

        socket.on("removeChatUser", ({ userName, chatId }) => {
            const index = chatUsers.findIndex(
                (user) => user.userName === userName && user.chatId === chatId
            );

            if (chatId) {
                chatIdToSocketIdMap.delete(chatId);
            }

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
            if (!newRoom || !newRoom.id) return;

            const roomAlreadyExists = rooms.some((room) => room.id === newRoom.id);
            if (!roomAlreadyExists) {
                rooms.push(newRoom);
            }

            chatNamespace.emit("addRoom", newRoom);
            console.log(rooms);
        });

        socket.on("deleteRoom", (roomId) => {
            chatNamespace.emit("deleteRoom", roomId);
            removeRoomById(roomId);
            console.log(rooms);
        });

        socket.on("joinRoom", ({ roomId, roomKey }) => {
            const room = rooms.find((entry) => entry.id === roomId);

            if (!room) {
                socket.emit("joinRoomError", { message: "That room no longer exists." });
                return;
            }

            const providedKey = String(roomKey || "").trim();
            const storedKey = String(room.roomKey || "").trim();

            if (room.isPrivate && storedKey && providedKey !== storedKey) {
                socket.emit("joinRoomError", { message: "Incorrect room password." });
                return;
            }

            if (!socket.rooms.has(roomId)) {
                socket.join(roomId);
            }

            const userName = socket.data?.userName || "A user";
            chatNamespace.to(roomId).emit("roomSystemMessage", {
                type: "system",
                roomId,
                text: `${userName} joined the room.`,
            });
            socket.emit("roomJoined", { roomId, roomName: room.name });
        });

        socket.on("leaveRoom", (roomId) => {
            const userName = socket.data?.userName || "A user";
            if (socket.rooms.has(roomId)) {
                socket.leave(roomId);
                chatNamespace.to(roomId).emit("roomSystemMessage", {
                    type: "system",
                    roomId,
                    text: `${userName} left the room.`,
                });
            }
        });

        socket.on("sendRoomMessage", (data) => {
            if (!data?.roomId) return;
            chatNamespace.to(data.roomId).emit("receiveRoomMessage", data);
            console.log(data);
        });

        socket.on("disconnect", () => {
            const userName = socket.data?.userName || "A user";
            const chatId = socket.data?.chatId;
            const joinedRooms = Array.from(socket.rooms).filter((roomId) => roomId !== socket.id);
            const activeChatWith = socket.data?.activeChatWith;

            if (activeChatWith) {
                const peerSocketId = chatIdToSocketIdMap.get(activeChatWith);
                if (peerSocketId) {
                    chatNamespace.to(peerSocketId).emit("chatLeft");
                }
            }

            joinedRooms.forEach((roomId) => {
                chatNamespace.to(roomId).emit("roomSystemMessage", {
                    type: "system",
                    roomId,
                    text: `${userName} left the room.`,
                });
            });

            if (chatId) {
                chatIdToSocketIdMap.delete(chatId);
                const index = chatUsers.findIndex((user) => user.chatId === chatId);
                if (index !== -1) {
                    const removedUser = chatUsers.splice(index, 1)[0];
                    chatNamespace.emit("userUpdate", {
                        type: "remove",
                        who: removedUser,
                        users: chatUsers,
                    });
                }
            }

            console.log(`LEFT /chatroom ==> ${socket.id} `);
        });
    });
};
export default handleChatNamespace;
