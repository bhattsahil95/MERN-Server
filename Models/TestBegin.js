import mongoose from "mongoose";

const testSchema = new mongoose.Schema({

    name: {type: String, required: true, unique: true},
    note : {type : String},
    hashedNote : {type: String}

})

const TestModel = mongoose.model('test', testSchema) 


let fakeData = {
  name : "Sweetu",
  note : " Some Data. "
}

export default async function beginDB() {
    try {
      const existingData = await TestModel.findOne({ name: fakeData.name });
  
      if (!existingData) {
        const defaultData = new TestModel({
          name: fakeData.name,
          note: fakeData.note
        });
  
        await defaultData.save();
        console.log("Default data added successfully.");
      } else {
        console.log("Default data already exists.");
      }
    } catch (error) {
      console.error("Error adding default data:", error);
    }
  }
  
 export { TestModel }; 