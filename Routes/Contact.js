import express from "express";
import _ from "lodash";
import multer from "multer";
import { submitContact } from "../Models/ContactDataModel.js";

const router = express.Router();

// Create a multer instance
const upload = multer();

// Use multer as middleware to handle form data
router.use(upload.any());

// Use middleware for JSON data and form submissions
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

//---- CHECKING CONNECTION !  ----//

router.get("/", (req, res) => {
    res.send("Contact Router is working fine! ");
});

// Use router.post() here instead of app.post()
router.post("/email", async (req, res) => {
    const formData = req.body || {};
    const { firstName, lastName, phoneNumber, email, message } = formData;

    if (!firstName || !lastName || !phoneNumber || !email || !message) {
        return res.status(400).json({
            ok: false,
            message: "Please complete every field before sending your message.",
        });
    }

    const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const phonePattern = /^\+\d{1,3} \d{3} \d{3} \d{4}$/;

    if (!emailPattern.test(email) || !phonePattern.test(phoneNumber)) {
        return res.status(400).json({
            ok: false,
            message: "Please provide a valid email address and phone number.",
        });
    }

    try {
        await submitContact({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber.trim(),
            email: email.trim(),
            message: message.trim(),
        });

        return res.status(201).json({
            ok: true,
            message: "Message delivered successfully.",
        });
    } catch (error) {
        console.error("Error submitting contact form:", error);
        return res.status(500).json({
            ok: false,
            message: "The server could not save your message right now.",
        });
    }
});

export { router as contactRouter };
