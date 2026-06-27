import mongoose from "mongoose"; // Importing Mongoose for MongoDB interactions
import { config } from "dotenv";
import dns from "node:dns";

config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_NAME}.szcu3wa.mongodb.net/MERN?retryWrites=true&w=majority`;
// Optional configurations
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

// Connect to MongoDB Atlas
async function connectToMongoDB() {
    const startTime = new Date(); // Timestamp before connection

    try {
        await mongoose.connect(uri, options);

        const endTime = new Date(); // Timestamp after successful connection
        const elapsedTime = (endTime - startTime) / 1000; // Calculate elapsed time in seconds

        console.log(
            `${startTime}  ==> Connected to MongoDB Atlas in ${elapsedTime} seconds`
        );

        const db = mongoose.connection;
        return db;

        // Start your application or perform database operations 
    } catch (error) {
        console.error("Failed to connect to MongoDB Atlas from the backend Server:", error);
    }
}

const db = connectToMongoDB();

export default db;
