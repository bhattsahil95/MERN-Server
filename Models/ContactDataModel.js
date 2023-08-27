import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    phoneNumber: String,
    email: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
});

const Submission = mongoose.model("Submission", submissionSchema);

// Export the submitNote function
const submitContact = async (noteData) => {
    try {
        const newNote = new Submission(noteData);
        return await newNote.save();
    } catch (error) {
        throw error;
    }
};

export default Submission;
export { submitContact };
