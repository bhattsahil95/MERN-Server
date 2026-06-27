class ChatRoom {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.users = [];
    }

    addUser(user) {
        this.users.push(user);
    }

    removeUser(userId) {
        const indexToRemove = this.users.findIndex(
            (user) => user.id === userId
        );
        if (indexToRemove !== -1) {
            this.users.splice(indexToRemove, 1);
        }
    }
}

export default ChatRoom;
