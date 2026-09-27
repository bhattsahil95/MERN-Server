// Scope: stores validated portfolio contact submissions.

import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
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
