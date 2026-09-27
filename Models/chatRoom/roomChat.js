// Scope: defines persisted room metadata without storing plaintext passwords.

import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String },
    hostId: { type: String },
    isPrivate: { type: Boolean },
    roomKeyHash: { type: String, select: false },
});

const roomModel = mongoose.model("Room", roomSchema);

export default roomModel;
