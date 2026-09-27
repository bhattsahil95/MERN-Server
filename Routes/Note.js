// Scope: exposes the bounded public notes demo API.

import  express  from "express";
import db from "../Models/connect.js";
import  {createNote, updateNote, softDeleteNote, restoreNote}  from "../Models/NoteModel.js";
import { createRateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const noteWriteRateLimit = createRateLimit({ limit: 30, windowMs: 60_000 });


////////////////////////////////////////////////// ROUTES ////////////////////////////////////////////////////


//---- CHECKING CONNECTION !  ----//

router.get('/', (req, res) => {
    res.send("Note Router is working fine! ")
  })
  


///////////////// GET //////////////////

router.get('/data', async (req, res) => {

    try{
        const dbInstance = await db;
        const requestedStatus = req.query.status || 'active';
        const allowedStatuses = new Set(['active', 'deleted', 'draft']);
        if (!allowedStatuses.has(requestedStatus)) {
          res.status(400).json({ error: 'Invalid note status' });
          return;
        }
        const data = await dbInstance.collection('notes').find({ status: requestedStatus }).sort({ timeCreated: -1 }).toArray();
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
router.post("/create", noteWriteRateLimit, async (req, res) => {
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

router.put('/update/:id', noteWriteRateLimit, async (req, res) => {
    const noteId = req.params.id;
    const updatedFields = req.body;
  
    const result = await updateNote(noteId, updatedFields);
  
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(404).json({ message: result.message });
    }
  });


  router.put('/soft-delete/:id', noteWriteRateLimit, async (req, res) => {
    const noteId = req.params.id;
  
    const result = await softDeleteNote(noteId);
  
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(404).json({ message: result.message });
    }
  });

  router.put('/restore/:id', noteWriteRateLimit, async (req, res) => {
    const result = await restoreNote(req.params.id);
    res.status(result.success ? 200 : 404).json({ message: result.message });
  });
  

export {router as noteRouter} ;

