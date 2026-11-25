
import { Router } from "express";

import {
    scheduleEmailController,
    getScheduledEmailsController,
    getSentEmailsController,
    getSendersController
} from "../controllers/email.controller";

import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Protect all email routes

router.use(requireAuth);

router.post("/schedule", scheduleEmailController);

router.get("/scheduled", getScheduledEmailsController);

router.get("/sent", getSentEmailsController);

router.get("/senders", getSendersController);

export default router;