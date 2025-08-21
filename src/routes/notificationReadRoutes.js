import express from "express";
import { markAsRead } from "../controllers/notificationReadController.js";
const router = express.Router();

router.post("/", markAsRead);

export default router;
