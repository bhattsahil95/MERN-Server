// Scope: validates and stores bounded public portfolio contact submissions.

import express from "express";
import { submitContact } from "../Models/ContactDataModel.js";
import { createRateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const contactRateLimit = createRateLimit({ limit: 5, windowMs: 15 * 60_000 });

//---- CHECKING CONNECTION !  ----//

router.get("/", (req, res) => {
    res.send("Contact Router is working fine! ");
});

// Use router.post() here instead of app.post()
router.post("/email", contactRateLimit, async (req, res) => {
    const formData = req.body || {};
    const firstName = String(formData.firstName || "").trim();
    const lastName = String(formData.lastName || "").trim();
    const phoneNumber = String(formData.phoneNumber || "").trim();
    const email = String(formData.email || "").trim().toLowerCase();
    const message = String(formData.message || "").trim();

    if (!firstName || !lastName || !phoneNumber || !email || !message) {
        return res.status(400).json({
            ok: false,
            message: "Please complete every field before sending your message.",
        });
    }

    const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const phonePattern = /^\+\d{1,3} \d{3} \d{3} \d{4}$/;
    const lengthsAreValid = firstName.length <= 60
        && lastName.length <= 60
        && email.length <= 254
        && phoneNumber.length <= 30
        && message.length <= 4000;

    if (!lengthsAreValid || !emailPattern.test(email) || !phonePattern.test(phoneNumber)) {
        return res.status(400).json({
            ok: false,
            message: "Please provide a valid email address and phone number.",
        });
    }

    try {
        await submitContact({
            firstName,
            lastName,
            phoneNumber,
            email,
            message,
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
