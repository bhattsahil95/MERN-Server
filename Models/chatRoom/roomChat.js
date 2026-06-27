import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String },
    hostId: { type: String },
    isPrivate: { type: Boolean },
    roomKey: { type: String },
});

const roomModel = mongoose.model("Room", roomSchema);

export default roomModel;
