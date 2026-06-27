function handleJoinChat(socket, data, chatUsers) {
    const { sourcePage, userId } = data;

    const userExists = chatUsers.some((user) => user.userId === userId);

    if (!userExists) {
        chatUsers.push({
            userId: userId,
            joinedAt: new Date(),
            sourcePage: sourcePage,
        });
    }

    socket.emit("joinChatPage", chatUsers);
}

function handleLeaveChat(socket, data, chatUsers) {
    const { userId } = data;
    // Modify the original array directly
    const index = chatUsers.findIndex((user) => user.userId === userId);
    if (index !== -1) {
        chatUsers.splice(index, 1);
    }

    socket.broadcast.emit("leftChatPage", chatUsers);
}

export { handleJoinChat, handleLeaveChat };
