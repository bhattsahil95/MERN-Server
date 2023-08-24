import  express from "express";
import db from "../Models/connect.js";
import { TestModel } from "../Models/TestBegin.js";
import  _  from 'lodash';
import bcrypt from 'bcrypt';
import multer from 'multer'; 
import { io } from "../index.js";



const router = express.Router();

// Create a multer instance
const upload = multer();

// Use multer as middleware to handle form data
router.use(upload.any());

// Use middleware for JSON data
router.use(express.json());



////// POST ////////  

router.post('/1', async (req, res) => {
  console.log("API hit!");
  console.log("req.body:", req.body);

  if (_.isEmpty(req.body)) {
    res.status(400).json({ "response": "You sent a blank entry! Data not valid!" });
    return;
  }

  const { name, note, ...otherProps } = req.body;

  let hashedNote = ''; 

  if(note){
    hashedNote = await bcrypt.hash(note, 10)
  }

  if (!name) {
    res.status(400).json({ "response": "Invalid data format! 'name' is required." });
    return;
  }

  try {
    const existingData = await TestModel.findOne({ name });

    if (existingData) {
      // Name already exists in the database
      res.status(200).send(existingData);
    } else {
      // Name does not exist, check for additional properties
      if (_.isEmpty(otherProps)) {
        // Only 'name' and 'note' properties are present
        const newData = new TestModel({ name, note, hashedNote });
        await newData.save();
        res.status(201).send("Data saved successfully");
      } else {
        // Additional properties are present
        const newData = new TestModel({ name, note, hashedNote });
        await newData.save();
        const additionalProperties = Object.keys(otherProps).join(', ');
        res.status(400).json({
          "response": `Saved information successfully. But ${additionalProperties} is an invalid entry and will not be added. to the DATABASE`
        });
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred");
  }
});


router.post('/2', (req,res) => {
  
  const data = req.body; 
  console.log("Hit /2 API")
  console.log(req.body)
  const message = {"message": "Got it!"}

  res.send([message,data])

} 





);


///////////////Get Request Test//////////////////


router.get('/', (req, res) => {
  res.send("Router is working fine!"); 
  io.emit('testRoute', 'Test Router is Working'); 
})



// Get the Response from the databae 

router.get('/3', async (req, res) => {
  try {
    const dbInstance = await db; // Await the database connection
    const data = await dbInstance.collection('tests').find().toArray();
    res.json(data); // Send the data as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' }); // Send an error response as JSON
  }
});

// Console Log Queries from the Get request 

router.get('/4', (req, res) => {
  console.log(req.query)
  res.json({"message": "Working Fine!"})
});


// Add parametere to the get request. Select the collection from the database from which you want data 

router.get('/5/:collectionName', async (req, res) => {
  const collectionName = req.params.collectionName;

  // Define a list of valid collection names
  const validCollections = ['notes', 'tests'];

  // Check if the provided collection name is valid
  if (!validCollections.includes(collectionName)) {
    return res.status(400).json({ error: 'Invalid collection name. U can choose from either tests or notes. ' });
  }

  try {
    const dbInstance = await db; // Await the database connection
    const data = await dbInstance.collection(collectionName).find().toArray();
    res.json(data); // Send the data as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' }); // Send an error response as JSON
  }
});



// Add additional information in the query such as limit and select the collection 

router.get('/6/:collectionName', async (req, res) => {
  const collectionName = req.params.collectionName;
  const limit = parseInt(req.query.limit);

  // Define a list of valid collection names
  const validCollections = ['notes', 'tests'];

  // Check if the provided collection name is valid
  if (!validCollections.includes(collectionName)) {
    return res.status(400).json({ error: 'Invalid collection name' });
  }

  try {
    const dbInstance = await db; // Await the database connection
    const collection = dbInstance.collection(collectionName);

    let data;
    if (isNaN(limit)) {
      // If limit is not provided or is NaN, fetch all documents
      data = await collection.find().toArray();
    } else {
      // Fetch documents with the specified limit
      data = await collection.find().limit(limit).toArray();
    }

    res.json(data); // Send the data as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' }); // Send an error response as JSON
  }
});


// From the selected collection, get data that matches the search query. you can also limit the results. For now it matches the whole words only. It does not match just text patterns 

router.get('/7/:collectionName', async (req, res) => {
  const collectionName = req.params.collectionName;
  const limit = parseInt(req.query.limit);
  const search = req.query.search;

  console.log('Collection Name:', collectionName);
  console.log('Limit:', limit);
  console.log('Search:', search);

  // Define a list of valid collection names
  const validCollections = ['notes', 'tests'];

  // Check if the provided collection name is valid
  if (!validCollections.includes(collectionName)) {
    return res.status(400).json({ error: 'Invalid collection name' });
  }

  try {
    const dbInstance = await db; // Await the database connection
    const collection = dbInstance.collection(collectionName);

    let query = {};
    if (search) {
      // If search query is provided, create a regex pattern and convert it to a string
      const regex = new RegExp(search, 'i');
      const searchString = regex.toString();
      query = { $text: { $search: searchString} }      
    }

    console.log('Query:', query);

    let data;
    if (isNaN(limit)) {
      // If limit is not provided or is NaN, fetch all documents
      data = await collection.find(query).toArray();
    } else {
      // Fetch documents with the specified limit
      data = await collection.find(query).limit(limit).toArray();
    }

    res.json(data); // Send the data as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' }); // Send an error response as JSON
  }
});


// From the selected collection this will return results based on the search and limit queries. Also, you can seach the fields based not on words but regex pattern of the words.
// If the search query is 'ell' it will return all the documents with 'Hello' 'Yellow' etc 


router.get('/8/:collectionName', async (req, res) => {
  const collectionName = req.params.collectionName;
  const limit = parseInt(req.query.limit);
  const search = req.query.search;

  console.log('Collection Name:', collectionName);
  console.log('Limit:', limit);
  console.log('Search:', search);

  // Define a list of valid collection names
  const validCollections = ['notes', 'tests'];

  // Check if the provided collection name is valid
  if (!validCollections.includes(collectionName)) {
    return res.status(400).json({ error: 'Invalid collection name' });
  }

  try {
    const dbInstance = await db; // Await the database connection
    const collection = dbInstance.collection(collectionName);

    let query = {};
    if (search) {
      
       // Extract field names from the document OPTION 1 
      // const document = await collection.findOne({});
      // const fields = Object.keys(document);

      // Manuall Search Fields OPTION 2 
      const fields = ['name', 'note', 'title', 'content'];

    // Construct a query object with regex conditions for each field
    query = {
      $or: fields.map((field) => ({
        [field]: { $regex: search, $options: 'i' },
      })),
    };
      
    
    }

    console.log('Query:', query);

    let data;
    if (isNaN(limit)) {
      // If limit is not provided or is NaN, fetch all documents
      data = await collection.find(query).limit(limit).toArray();
    } else {
      // Fetch documents with the specified limit
      data = await collection.find(query).limit(limit).toArray();
    }

    res.json(data); // Send the data as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' }); // Send an error response as JSON
  }
});



export {router as testRouter};