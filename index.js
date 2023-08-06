//////////////////////////////////Importing Dependancies for the Project ///////////////////////////////////////////

import express from 'express'; // Importing the Express.js framework
import cors from 'cors'; // Importing the CORS middleware
import { fileURLToPath } from 'url'; // Importing the fileURLToPath function from the 'url' module
import { dirname } from 'path'; // Importing the dirname function from the 'path' module
import { config } from 'dotenv';
import mongoose from 'mongoose';



//////// Imports from the Project //////////

import db from './Models/connect.js';
import {testRouter } from './Routes/Test.js'
import {noteRouter} from './Routes/Note.js';
import beginDB from './Models/TestBegin.js';
import beginDBTest from './Models/NoteModel.js';



////////////////////////////////////// APP Set up and Configurations //////////////////////////////////////////////
config();
// Starting Express app
const app = express();
const ServerPort = process.env.PORT || 5500; // Use environment variable PORT if available, otherwise use 5500 // Only to be used in the development. Shall be replaced in the production with .env 

app.use(express.json())


app.use(cors())


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

///////// CONNECTION WITH DATABASE //////////// 



// Get reference to the MongoDB connection


beginDB();
beginDBTest();

db.then(async (db) => {
    const data = await db.db.collection('tests').find().toArray();
    data.forEach((item, index) => {
      console.log(`Item at index ${index} : ${item.name}`);
    });
  });
  
////////////////////////////////// API - ROUTES //////////////////////////////////////////////
app.get("/", function(req,res){
   
    res.send("Active! Sahil ");
    
})

app.use('/test', testRouter);
app.use('/note', noteRouter)



////////////////////////////////////////////////// Starting my Express App /////////////////////////////////////////////

app.listen(ServerPort, () => {
      console.log(`Started Express app on port ${ServerPort} `)
});

