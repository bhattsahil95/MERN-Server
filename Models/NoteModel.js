import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    timeCreated: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'deleted', 'draft'], default: 'active' }
    
  });
  

const NoteModel = mongoose.model('note', noteSchema)




let fakeData = {
  title: "Test Note Title2",
  content: "Test Note Content, Content ..... . .. ."
}

export default async function beginDBTest() {

  try {
    
    const existingData = await NoteModel.findOne( {title : fakeData.title} );

    if (!existingData) {
      const defaultData = new NoteModel({
        title: fakeData.title,
        content: fakeData.content
      })

      await defaultData.save();
      console.log("Deafult Notes Data added successfully ! ")
    }
    else{
      console.log("Degfault Notes Data already exists in Notes Model.")
    }

  }
  catch (error) {
    console.log(`Error Adding Default Data in Notes Model. Error: ${error}`)
  }


}





// Function to create a new note using Mongoose
async function createNote(noteData) {
  const { title, content } = noteData;

  // Check if title and content are present
  if (!title || !content) {
    throw new Error("Title and content are required.");
  }

  // Create a new note using Mongoose
  const newNote = new NoteModel({
    title,
    content,
  });

  // Save the new note to the database
  const savedNote = await newNote.save();
  return savedNote;
}

//-------------------------------------------------------------------------------------//

// Update an existing note by ID
async function updateNote(noteId, updatedFields) {
  // Define the fields that are allowed to be updated
const allowedUpdateFields = ['title', 'content'];

 // Create an object to hold the fields that can be updated
 const updateData = {};

 // Iterate through allowed fields and add them to the 'updateData' object
 allowedUpdateFields.forEach(field => {
   if (updatedFields.hasOwnProperty(field)) {
     updateData[field] = updatedFields[field];
   }
 });

 // If there are no fields to update, return an error
 if (Object.keys(updateData).length === 0) {
   return { success: false, message: 'No valid fields to update' };
 }

 // Update the 'lastUpdated' field to the current timestamp
 updateData.lastUpdated = new Date();
    
try {
 
    const result = await NoteModel.findByIdAndUpdate(noteId, updateData);

    if (!result) {
      return { success: false, message: 'Note not found' };
    }

    return { success: true, message: 'Note updated successfully' };
  } catch (error) {
    return { success: false, message: 'An error occurred while updating the note' };
  }
}

// Soft delete a note by ID
async function softDeleteNote(noteId) {
  try {
    const result = await NoteModel.findByIdAndUpdate(
      noteId,
      { status: 'deleted', lastUpdated: new Date() },
      { new: true }
    );

    if (!result) {
      return { success: false, message: 'Note not found' };
    }

    return { success: true, message: 'Note soft deleted successfully' };
  } catch (error) {
    return { success: false, message: 'An error occurred while soft deleting the note' };
  }
}



// Delete a note by ID
async function deleteNote(id) {
  try {
    const deletedNote = await NoteModel.findByIdAndDelete(id);
    return deletedNote;
  } catch (error) {
    throw new Error("Error deleting note");
  }
}

export { createNote, updateNote, deleteNote, NoteModel, softDeleteNote };


