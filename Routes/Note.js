import  express  from "express";
import db from "../Models/connect.js";
import  {createNote, updateNote, deleteNote, softDeleteNote}  from "../Models/NoteModel.js";
import _ from 'lodash';
import multer from 'multer'

const router = express.Router();

// Create a multer instance
const upload = multer();

// Use multer as middleware to handle form data
router.use(upload.any());

// Use middleware for JSON data
router.use(express.json());


////////////////////////////////////////////////// ROUTES ////////////////////////////////////////////////////


//---- CHECKING CONNECTION !  ----//

router.get('/', (req, res) => {
    res.send("Note Router is working fine! ")
  })
  


///////////////// GET //////////////////

router.get('/data', async (req, res) => {

    try{
        const dbInstance = await db;
        const data = await dbInstance.collection('notes').find().sort({ timeCreated: -1 }).toArray();
        // const data = await dbInstance.collection('notes').find().toArray();
        res.json(data)
    }catch (error) {
        console.error(error);
        res.status(500).json({error:"Some Error Occured "})

    }

});


  
// Route to get notes by status
router.get('/data/custom', async (req, res) => {
    const requestedStatus = req.query.status;
    console.log("Hiting this")
    console.log(requestedStatus)
  
    try {
      const dbInstance = await db;
      let data;
  
      if (requestedStatus) {
        data = await dbInstance.collection('notes').find({ status: requestedStatus }).toArray();
      } else {
        data = await dbInstance.collection('notes').find().toArray();
      }
  
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Some Error Occurred" });
    }
  });




// Route to get notes by status
router.get('/data/:status?', async (req, res) => {
    const requestedStatus = req.params.status;
  
    try {
      const dbInstance = await db;
      let data;
  
      if (requestedStatus) {
        data = await dbInstance.collection('notes').find({ status: requestedStatus }).toArray();
      } else {
        data = await dbInstance.collection('notes').find().toArray();
      }
  
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Some Error Occurred" });
    }
  });


//////////////// POST //////////////////

// Route to create a new note
router.post("/create", async (req, res) => {
    const noteData = req.body;
  
    try {
      // Create the note using the createNote function
      const createdNote = await createNote(noteData);
  
      // Respond with the created note and 201 status
      res.status(201).json(createdNote);
    } catch (error) {
      // Handle any errors that occurred during note creation
      res.status(500).json({ error: error.message });
    }
  });


// /////////// PUT //////////////////////

router.put('/update/:id', async (req, res) => {
    const noteId = req.params.id;
    const updatedFields = req.body;
  
    const result = await updateNote(noteId, updatedFields);
  
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(404).json({ message: result.message });
    }
  });


  router.put('/soft-delete/:id', async (req, res) => {
    const noteId = req.params.id;
  
    const result = await softDeleteNote(noteId);
  
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(404).json({ message: result.message });
    }
  });
  

  //------------------------------------------------//
  router.delete('/delete/:id', async (req, res) => {
    const noteId = req.params.id;
  
    try {
      const deletedNote = await deleteNote(noteId);
  
      if (deletedNote) {
        res.status(200).json({ message: 'Note deleted successfully' });
      } else {
        res.status(404).json({ message: 'Note not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'An error occurred while deleting the note' });
    }
  });


export {router as noteRouter} ;

