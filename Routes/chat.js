// Scope: exposes the HTTP health boundary for the real-time chat demo.

import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Connection Working!");
});

export { router as chatRoute };
