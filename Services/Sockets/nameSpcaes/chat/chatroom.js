// Scope: owns ephemeral portfolio chat presence, direct messages, and room events.

import {
    allowSocketAction,
    createMessage,
    hashRoomPassword,
    parseChatId,
    parseMessage,
    parseRoomInput,
    parseUserName,
    roomPasswordMatches,
    toPublicRoom,
} from "./chatGuardrails.js";

const handleChatNamespace = (chatNamespace) => {
    // Stores currently connected chat users.
    // Example item: { userName: "John", chatId: "123" }
    const chatUsers = [];

    // Maps a stable chatId to the user's current socket.id.
    // This allows direct 1-on-1 messages and chat requests.
    const chatIdToSocketIdMap = new Map();

    // Stores active public/private rooms created by users.
    // Important: rooms are in memory only. They will reset when the server restarts.
    const rooms = [];
    const pendingChatRequests = new Map();

    // -------------------------------------------------------------------------
    // Room helpers
    // -------------------------------------------------------------------------

    // Send the complete room list to every connected socket.
    // This keeps all clients synced, including when the room list becomes empty.
    const broadcastRoomSync = () => {
        chatNamespace.emit("roomUpdate", rooms.map(toPublicRoom));
    };

    // Send the complete room list to one socket.
    // Important: send even when rooms = [] so stale client state gets cleared.
    const sendRoomSyncToSocket = (socket) => {
        socket.emit("roomUpdate", rooms.map(toPublicRoom));
    };

    const broadcastRoomPresence = (roomId) => {
        chatNamespace.to(roomId).emit("roomPresence", {
            roomId,
            count: chatNamespace.adapter.rooms.get(roomId)?.size || 0,
        });
    };

    // Remove one room by room id.
    const removeRoomById = (roomId) => {
        const indexToRemove = rooms.findIndex((room) => room.id === roomId);

        if (indexToRemove !== -1) {
            rooms.splice(indexToRemove, 1);
            return true;
        }

        return false;
    };

    // Remove every room created by a specific chat user.
    // This is used when a user leaves, refreshes, closes the tab, or disconnects.
    const removeRoomsByCreatorChatId = (chatId) => {
        if (!chatId) return;

        const roomsToDelete = rooms.filter(
            (room) => room.createdByChatId === chatId
        );

        if (roomsToDelete.length === 0) return;

        roomsToDelete.forEach((room) => {
            removeRoomById(room.id);

            chatNamespace.emit("deleteRoom", {
                roomId: room.id,
                silent: true,
            });
        });

        chatNamespace.emit("roomsClosed", {
            count: roomsToDelete.length,
            message:
                roomsToDelete.length === 1
                    ? "1 room was closed."
                    : `${roomsToDelete.length} rooms were closed.`,
        });

        broadcastRoomSync();
    };

    // If a user renames themselves, update the display name on rooms they created.
    // We do not delete rooms on rename because rename should not destroy active room state.
    const updateRoomsCreatorName = (chatId, newUserName) => {
        if (!chatId || !newUserName) return;

        let didUpdate = false;

        rooms.forEach((room) => {
            if (room.createdByChatId === chatId) {
                room.createdByName = newUserName;
                didUpdate = true;
            }
        });

        if (didUpdate) {
            broadcastRoomSync();
        }
    };

    // -------------------------------------------------------------------------
    // Socket namespace connection
    // -------------------------------------------------------------------------

    chatNamespace.on("connection", (socket) => {
        console.log(`JOINED /chatroom ==> ${socket.id}`);

        // Each socket can keep several explicitly accepted direct conversations open.
        const activeChatsFor = (targetSocket) => {
            if (!(targetSocket.data.activeChatIds instanceof Set)) {
                targetSocket.data.activeChatIds = new Set();
            }
            return targetSocket.data.activeChatIds;
        };

        // Always send room state on connection.
        // This clears stale client-side rooms if the server has no rooms.
        sendRoomSyncToSocket(socket);

        // ---------------------------------------------------------------------
        // User registration / update
        // ---------------------------------------------------------------------

        socket.on("newChatUser", (payload = {}) => {
            const chatId = parseChatId(payload.chatId);
            const userName = parseUserName(payload.userName);

            if (!chatId || !userName) {
                socket.emit("userError", {
                    message: "Use a 3–12 character name containing letters.",
                });
                return;
            }
            if (socket.data?.chatId && socket.data.chatId !== chatId) {
                socket.emit("userError", { message: "Renew your chat identity before joining again." });
                return;
            }
            if (!chatUsers.some((user) => user.chatId === chatId) && chatUsers.length >= 200) {
                socket.emit("userError", { message: "The live chat is currently full." });
                return;
            }
            const nameIsTaken = chatUsers.some(
                (user) => user.chatId !== chatId
                    && user.userName.toLowerCase() === userName.toLowerCase()
            );
            if (nameIsTaken) {
                socket.emit("userError", { message: "That display name is already in use." });
                return;
            }

            const mappedSocketId = chatIdToSocketIdMap.get(chatId);
            if (mappedSocketId && mappedSocketId !== socket.id && chatNamespace.sockets.has(mappedSocketId)) {
                socket.emit("userError", {
                    message: "This chat session is already active in another tab.",
                });
                return;
            }

            const userData = { userName, chatId };
            const existingIndex = chatUsers.findIndex(
                (entry) => entry.chatId === chatId
            );

            if (existingIndex !== -1) {
                const oldUserName = chatUsers[existingIndex].userName;

                chatUsers[existingIndex] = userData;

                // Keep room creator names synced when user renames themselves.
                if (oldUserName !== userName) {
                    updateRoomsCreatorName(chatId, userName);
                }
            } else {
                chatUsers.push(userData);
            }

            // Keep stable user identity on the socket.
            socket.data = {
                ...socket.data,
                chatId,
                userName,
            };

            chatIdToSocketIdMap.set(chatId, socket.id);

            chatNamespace.emit("userUpdate", {
                type: existingIndex !== -1 ? "update" : "add",
                who: userData,
                users: chatUsers,
            });

            // Send full room state after registration too.
            // This must run even when rooms is empty.
            sendRoomSyncToSocket(socket);
        });

        // ---------------------------------------------------------------------
        // 1-on-1 chat request flow
        // ---------------------------------------------------------------------

        socket.on("sendChatRequest", ({ guest } = {}) => {
            const hostId = socket.data?.chatId;
            const hostName = socket.data?.userName;
            const guestId = parseChatId(guest?.id);
            const guestUser = chatUsers.find((user) => user.chatId === guestId);

            if (!hostId || !hostName || !guestId || guestId === hostId || !guestUser) {
                socket.emit("failedChatRequest", { message: "That user is not available." });
                return;
            }
            if (!allowSocketAction(socket, "chat-request", { limit: 8, windowMs: 60_000 })) {
                socket.emit("failedChatRequest", { message: "Too many chat requests. Please wait a moment." });
                return;
            }

            const userData = {
                guest: { id: guestUser.chatId, name: guestUser.userName },
                host: { id: hostId, name: hostName },
            };
            const guestSocketId = chatIdToSocketIdMap.get(guestId);
            const guestSocket = chatNamespace.sockets.get(guestSocketId);

            if (guestSocket && activeChatsFor(socket).has(guestId)) {
                socket.emit("failedChatRequest", { message: "That conversation is already open." });
                return;
            }
            if ([...pendingChatRequests.keys()].some((key) => key.endsWith(`:${guestId}`))) {
                socket.emit("failedChatRequest", { message: "That user already has a pending request." });
                return;
            }

            if (guestSocketId) {
                const requestKey = `${hostId}:${guestId}`;
                const requestedAt = Date.now();
                pendingChatRequests.set(requestKey, requestedAt);
                chatNamespace
                    .to(guestSocketId)
                    .emit("receiveChatRequest", userData);
                setTimeout(() => {
                    if (pendingChatRequests.get(requestKey) !== requestedAt) return;
                    pendingChatRequests.delete(requestKey);
                    socket.emit("failedChatRequest", { message: "The chat request expired." });
                    chatNamespace.to(guestSocketId).emit("chatRequestCancelled", { hostId });
                }, 60_000);
            } else {
                socket.emit("failedChatRequest", { message: "That user is no longer connected." });
            }
        });

        socket.on("cancelChatRequest", () => {
            const hostId = socket.data?.chatId;
            const requestKey = [...pendingChatRequests.keys()].find((key) => key.startsWith(`${hostId}:`));
            if (!requestKey) return;
            const guestId = requestKey.split(":").at(-1);
            pendingChatRequests.delete(requestKey);
            const guestSocketId = chatIdToSocketIdMap.get(guestId);
            if (guestSocketId) chatNamespace.to(guestSocketId).emit("chatRequestCancelled", { hostId });
        });

        socket.on("confirmationResponse", (data = {}) => {
            const guestId = socket.data?.chatId;
            const guestName = socket.data?.userName;
            const hostId = parseChatId(data.chatParty?.host?.id);
            const requestKey = `${hostId}:${guestId}`;
            const requestedAt = pendingChatRequests.get(requestKey);

            if (!guestId || !guestName || !hostId || !requestedAt || Date.now() - requestedAt > 60_000) {
                socket.emit("chatRequestError", { message: "That chat request expired." });
                return;
            }
            pendingChatRequests.delete(requestKey);

            const hostUser = chatUsers.find((user) => user.chatId === hostId);
            const host = hostUser ? { id: hostUser.chatId, name: hostUser.userName } : null;
            const guest = { id: guestId, name: guestName };
            const hostSocketId = chatIdToSocketIdMap.get(hostId);
            const guestSocketId = socket.id;

            if (data.guestResponse === "yes" && host && hostSocketId) {
                if (hostSocketId) {
                    chatNamespace
                        .to(hostSocketId)
                        .emit("chatRequestAccept", { host, guest });
                }

                if (guestSocketId) {
                    chatNamespace
                        .to(guestSocketId)
                        .emit("chatRequestAccepted", { host, guest });
                }

                const hostSocket = chatNamespace.sockets.get(hostSocketId);
                activeChatsFor(socket).add(host.id);
                if (hostSocket) activeChatsFor(hostSocket).add(guest.id);
            } else if (hostSocketId) {
                chatNamespace
                    .to(hostSocketId)
                    .emit("chatRequestDecline", { guest });
            }
        });

        socket.on("chatLeft", ({ partnerId } = {}) => {
            const otherChatId = parseChatId(partnerId);
            if (!otherChatId || !activeChatsFor(socket).has(otherChatId)) return;
            const otherSocketId = chatIdToSocketIdMap.get(otherChatId);

            if (otherSocketId) {
                chatNamespace.to(otherSocketId).emit("chatLeft", {
                    partnerId: socket.data?.chatId,
                    partnerName: socket.data?.userName,
                });
                const otherSocket = chatNamespace.sockets.get(otherSocketId);
                if (otherSocket) activeChatsFor(otherSocket).delete(socket.data?.chatId);
            }
            activeChatsFor(socket).delete(otherChatId);
        });

        socket.on("sendMessage", (data = {}, acknowledge = () => {}) => {
            const senderId = socket.data?.chatId;
            const senderName = socket.data?.userName;
            const receiver = parseChatId(data.receiver);
            const message = parseMessage(data.message);

            if (!senderId || !senderName || !receiver || !activeChatsFor(socket).has(receiver) || !message) {
                const error = "Unable to send that message.";
                socket.emit("messageError", { message: error });
                acknowledge({ ok: false, message: error });
                return;
            }
            if (!allowSocketAction(socket, "direct-message", { limit: 20, windowMs: 10_000 })) {
                const error = "You are sending messages too quickly.";
                socket.emit("messageError", { message: error });
                acknowledge({ ok: false, message: error });
                return;
            }

            const receiverSocketId = chatIdToSocketIdMap.get(receiver);

            if (!receiverSocketId) {
                const error = "Receiver is no longer connected.";
                socket.emit("messageError", { message: error });
                acknowledge({ ok: false, message: error });
                return;
            }

            const messageData = createMessage({
                message,
                receiver,
                sender: { id: senderId, name: senderName },
            });
            chatNamespace.to(receiverSocketId).emit("receiveMessage", messageData);
            acknowledge({ ok: true, message: messageData });
        });

        socket.on("directTyping", ({ receiver, isTyping } = {}) => {
            const receiverId = parseChatId(receiver);
            if (!receiverId || !activeChatsFor(socket).has(receiverId)) return;
            const receiverSocketId = chatIdToSocketIdMap.get(receiverId);
            if (receiverSocketId) {
                chatNamespace.to(receiverSocketId).emit("directTyping", {
                    senderId: socket.data?.chatId,
                    senderName: socket.data?.userName,
                    isTyping: Boolean(isTyping),
                });
            }
        });

        // Keeps an existing socket mapped to a chatId.
        // Kept from your original code because it may be used by your audit flow.
        socket.on("map-audit", ({ chatId } = {}) => {
            if (!socket.data?.chatId || parseChatId(chatId) !== socket.data.chatId) return;

            chatNamespace.to(socket.id).emit("userUpdate", {
                type: "update",
                who: { chatId: socket.data.chatId, userName: socket.data.userName },
                users: chatUsers,
            });
        });

        // ---------------------------------------------------------------------
        // Manual user removal
        // ---------------------------------------------------------------------

        socket.on("removeChatUser", () => {
            const chatId = socket.data?.chatId;
            const userName = socket.data?.userName;
            const index = chatUsers.findIndex(
                (user) => user.userName === userName && user.chatId === chatId
            );

            [...activeChatsFor(socket)].forEach((peerChatId) => {
                const peerSocketId = chatIdToSocketIdMap.get(peerChatId);
                const peerSocket = chatNamespace.sockets.get(peerSocketId);
                if (!peerSocketId) return;
                chatNamespace.to(peerSocketId).emit("chatLeft", {
                    partnerId: chatId,
                    partnerName: userName,
                });
                if (peerSocket) activeChatsFor(peerSocket).delete(chatId);
            });

            if (chatId) {
                // Delete all rooms created by this user before removing the user.
                removeRoomsByCreatorChatId(chatId);
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

            socket.data.chatId = null;
            socket.data.userName = null;
            socket.data.activeChatIds = new Set();
        });

        // ---------------------------------------------------------------------
        // Room create / update / delete
        // ---------------------------------------------------------------------

        socket.on("updateRoom", (newRoom) => {
            const chatId = socket.data?.chatId;
            const userName = socket.data?.userName;
            const roomInput = parseRoomInput(newRoom);

            if (!chatId || !userName) {
                socket.emit("roomError", {
                    message: "User must join chat before creating a room.",
                });
                return;
            }
            if (!roomInput) {
                socket.emit("roomError", {
                    message: "Room names must be 3–40 characters; private passwords must be 4–64 characters.",
                });
                return;
            }
            if (!allowSocketAction(socket, "room-write", { limit: 5, windowMs: 60_000 })) {
                socket.emit("roomError", { message: "Too many room changes. Please wait a moment." });
                return;
            }

            const existingRoomIndex = rooms.findIndex(
                (room) => room.id === roomInput.id
            );

            // Create new room.
            if (existingRoomIndex === -1) {
                const duplicateName = rooms.some(
                    (room) => room.name.toLowerCase() === roomInput.name.toLowerCase()
                );
                const ownedRoomCount = rooms.filter(
                    (room) => room.createdByChatId === chatId
                ).length;
                if (duplicateName || rooms.length >= 50 || ownedRoomCount >= 5) {
                    socket.emit("roomError", {
                        message: duplicateName
                            ? "A room with that name already exists."
                            : "The room limit has been reached.",
                    });
                    return;
                }

                const roomWithOwner = {
                    id: roomInput.id,
                    name: roomInput.name,
                    hostId: chatId,
                    isPrivate: roomInput.isPrivate,
                    roomKeyHash: roomInput.isPrivate ? hashRoomPassword(roomInput.roomKey) : null,
                    createdByChatId: chatId,
                    createdBySocketId: socket.id,
                    createdByName: userName,
                    createdAt: new Date(),
                    updatedAt: null,
                };

                rooms.push(roomWithOwner);

                // Optional event for clients that append one room.
                chatNamespace.emit("addRoom", toPublicRoom(roomWithOwner));

                // Required full sync so all clients match server state.
                broadcastRoomSync();

                console.log(rooms);
                return;
            }

            // Update existing room.
            const existingRoom = rooms[existingRoomIndex];

            // Only the creator can update their room.
            if (existingRoom.createdByChatId !== chatId) {
                socket.emit("roomError", {
                    message: "You can only update your own room.",
                });
                return;
            }

            rooms[existingRoomIndex] = {
                ...existingRoom,
                name: roomInput.name,
                isPrivate: roomInput.isPrivate,
                roomKeyHash: roomInput.isPrivate
                    ? hashRoomPassword(roomInput.roomKey)
                    : null,
                createdByChatId: existingRoom.createdByChatId,
                createdBySocketId: existingRoom.createdBySocketId,
                createdByName: userName,
                createdAt: existingRoom.createdAt,
                updatedAt: new Date(),
            };

            broadcastRoomSync();
            console.log(rooms);
        });

        socket.on("deleteRoom", (roomId) => {
            const chatId = socket.data?.chatId;
            const parsedRoomId = parseChatId(roomId);
            const room = rooms.find((entry) => entry.id === parsedRoomId);

            if (!room) return;

            // Only the room creator can delete the room.
            if (room.createdByChatId !== chatId) {
                socket.emit("roomError", {
                    message: "You can only delete your own room.",
                });
                return;
            }

            const didRemove = removeRoomById(parsedRoomId);

            if (didRemove) {
                // Optional event for clients that animate/remove one room.
                chatNamespace.emit("deleteRoom", parsedRoomId);

                // Required full sync so every client has the same final state.
                broadcastRoomSync();
            }

            console.log(rooms);
        });

        // ---------------------------------------------------------------------
        // Room join / leave / messages
        // ---------------------------------------------------------------------

        socket.on("joinRoom", ({ roomId, roomKey } = {}) => {
            if (!socket.data?.chatId) {
                socket.emit("joinRoomError", { message: "Join the chat page before entering a room." });
                return;
            }

            const parsedRoomId = parseChatId(roomId);
            const room = rooms.find((entry) => entry.id === parsedRoomId);

            if (!room) {
                socket.emit("joinRoomError", {
                    message: "That room no longer exists.",
                });

                // Force client to clear stale deleted rooms.
                sendRoomSyncToSocket(socket);
                return;
            }

            if (room.isPrivate && !roomPasswordMatches(roomKey, room.roomKeyHash)) {
                socket.emit("joinRoomError", {
                    message: "Incorrect room password.",
                });
                return;
            }

            const wasJoined = socket.rooms.has(parsedRoomId);
            if (!wasJoined) {
                socket.join(parsedRoomId);
            }

            const userName = socket.data?.userName || "A user";

            if (!wasJoined) chatNamespace.to(parsedRoomId).emit("roomSystemMessage", {
                type: "system",
                roomId: parsedRoomId,
                text: `${userName} joined the room.`,
                timeStamp: Date.now(),
            });

            socket.emit("roomJoined", {
                roomId: parsedRoomId,
                roomName: room.name,
            });
            broadcastRoomPresence(parsedRoomId);
        });

        socket.on("leaveRoom", (roomId) => {
            const userName = socket.data?.userName || "A user";
            const parsedRoomId = parseChatId(roomId);

            if (parsedRoomId && socket.rooms.has(parsedRoomId)) {
                socket.leave(parsedRoomId);

                chatNamespace.to(parsedRoomId).emit("roomSystemMessage", {
                    type: "system",
                    roomId: parsedRoomId,
                    text: `${userName} left the room.`,
                    timeStamp: Date.now(),
                });
                broadcastRoomPresence(parsedRoomId);
            }
        });

        socket.on("sendRoomMessage", (data = {}, acknowledge = () => {}) => {
            const roomId = parseChatId(data.roomId);
            const message = parseMessage(data.message);
            const senderId = socket.data?.chatId;
            const senderName = socket.data?.userName;
            const roomExists = rooms.some((room) => room.id === roomId);

            if (!roomExists || !roomId) {
                socket.emit("roomError", {
                    message: "That room no longer exists.",
                });

                // Force client to clear stale deleted rooms.
                sendRoomSyncToSocket(socket);
                acknowledge({ ok: false, message: "That room no longer exists." });
                return;
            }
            if (!senderId || !senderName || !socket.rooms.has(roomId) || !message) {
                const error = "Join the room before sending a valid message.";
                socket.emit("roomError", { message: error });
                acknowledge({ ok: false, message: error });
                return;
            }
            if (!allowSocketAction(socket, "room-message", { limit: 20, windowMs: 10_000 })) {
                const error = "You are sending messages too quickly.";
                socket.emit("roomError", { message: error });
                acknowledge({ ok: false, message: error });
                return;
            }

            const messageData = createMessage({
                message,
                roomId,
                sender: { id: senderId, name: senderName },
            });
            chatNamespace.to(roomId).emit("receiveRoomMessage", messageData);
            acknowledge({ ok: true, message: messageData });
        });

        socket.on("roomTyping", ({ roomId, isTyping } = {}) => {
            const parsedRoomId = parseChatId(roomId);
            if (!parsedRoomId || !socket.rooms.has(parsedRoomId)) return;
            socket.to(parsedRoomId).emit("roomTyping", {
                roomId: parsedRoomId,
                senderId: socket.data?.chatId,
                senderName: socket.data?.userName,
                isTyping: Boolean(isTyping),
            });
        });

        // ---------------------------------------------------------------------
        // Disconnect handling
        // ---------------------------------------------------------------------

        // Use disconnecting when you still need access to socket.rooms.
        // On disconnect, Socket.IO may already have removed room membership.
        socket.on("disconnecting", () => {
            const userName = socket.data?.userName || "A user";
            const chatId = socket.data?.chatId;

            const joinedRooms = Array.from(socket.rooms).filter(
                (roomId) => roomId !== socket.id
            );

            joinedRooms.forEach((roomId) => {
                chatNamespace.to(roomId).emit("roomSystemMessage", {
                    type: "system",
                    roomId,
                    text: `${userName} left the room.`,
                    timeStamp: Date.now(),
                });
            });

            // Delete rooms created by this user when they disconnect.
            removeRoomsByCreatorChatId(chatId);
        });

        socket.on("disconnect", () => {
            const chatId = socket.data?.chatId;
            const activeChatIds = [...activeChatsFor(socket)];

            activeChatIds.forEach((peerChatId) => {
                const peerSocketId = chatIdToSocketIdMap.get(peerChatId);
                if (peerSocketId) {
                    chatNamespace.to(peerSocketId).emit("chatLeft", {
                        partnerId: chatId,
                        partnerName: socket.data?.userName,
                    });
                }
            });

            if (chatId) {
                chatIdToSocketIdMap.delete(chatId);
                for (const key of pendingChatRequests.keys()) {
                    if (key.startsWith(`${chatId}:`) || key.endsWith(`:${chatId}`)) {
                        pendingChatRequests.delete(key);
                    }
                }

                const index = chatUsers.findIndex(
                    (user) => user.chatId === chatId
                );

                if (index !== -1) {
                    const removedUser = chatUsers.splice(index, 1)[0];

                    chatNamespace.emit("userUpdate", {
                        type: "remove",
                        who: removedUser,
                        users: chatUsers,
                    });
                }
            }

            console.log(`LEFT /chatroom ==> ${socket.id}`);
        });
    });
};

export default handleChatNamespace;
