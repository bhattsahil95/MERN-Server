import express from "express";
import _ from "lodash";
import multer from "multer";
import { submitContact } from "../Models/ContactDataModel.js";

const router = express.Router();

// Create a multer instance
const upload = multer();

// Use multer as middleware to handle form data
router.use(upload.any());

// Use middleware for JSON data
router.use(express.json());

//---- CHECKING CONNECTION !  ----//

router.get("/", (req, res) => {
    res.send("Contact Router is working fine! ");
});

// Use router.post() here instead of app.post()
router.post("/email", async (req, res) => {
    const formData = req.body;

    try {
        await submitContact(formData);
        res.sendStatus(200);
    } catch (error) {
        console.error("Error submitting note:", error);
        res.sendStatus(500);
    }
});

export { router as contactRouter };
