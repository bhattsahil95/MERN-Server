import express from "express";
import multer from "multer";
import roomModel from "../Models/chatRoom/roomChat.js";

const router = express.Router();

const upload = multer();
router.use(upload.any());

router.use(express.json());

router.get("/", (req, res) => {
    res.send("Connection Working!");
});

export { router as chatRoute };
