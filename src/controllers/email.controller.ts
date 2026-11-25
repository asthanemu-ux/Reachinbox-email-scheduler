
import { Request, Response } from "express";
import { AuthUser } from "../config/passport";
import { provisionSenders } from "../services/sender.service";

import {
    scheduleEmails,
    getScheduledEmails,
    getSentEmails,
    getSenders
} from "../services/email.service";

import { enqueueEmail } from "../services/emailQueue.service";
import { ScheduleEmailRequest } from "../types/email.types";


// Schedule emails

export async function scheduleEmailController(
    req: Request,
    res: Response
) {
    try {

        const data: ScheduleEmailRequest = req.body;

        const userId = (req.user as AuthUser | undefined)?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        if (
            !data ||
            typeof data.senderId !== "string" ||
            !data.senderId ||
            typeof data.subject !== "string" ||
            !data.subject.trim() ||
            typeof data.body !== "string" ||
            !data.body.trim() ||
            !Array.isArray(data.recipients) ||
            data.recipients.length === 0 ||
            typeof data.startTime !== "string"
        ) {
            res.status(400).json({
                success: false,
                message: "Missing or invalid required fields"
            });
            return;
        }

        const validRecipients = data.recipients.every(
            email =>
                typeof email === "string" &&
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        );

        if (!validRecipients) {
            res.status(400).json({
                success: false,
                message: "Invalid recipient email address"
            });
            return;
        }

        const startTime = new Date(data.startTime).getTime();

        if (
            !Number.isFinite(startTime) ||
            startTime < Date.now()
        ) {
            res.status(400).json({
                success: false,
                message: "Start time must be a valid future time"
            });
            return;
        }

        if (
            !Number.isInteger(data.minDelaySeconds) ||
            data.minDelaySeconds < 0 ||
            !Number.isInteger(data.hourlyLimit) ||
            data.hourlyLimit <= 0
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid delay or hourly limit"
            });
            return;
        }

        const result = await scheduleEmails(userId, data);

        let queuedCount = 0;

        for (const emailId of result.emailIds) {
            try {

                await enqueueEmail(emailId);

                queuedCount++;

            } catch (error) {

                console.error("Enqueue failed:", emailId, error);

            }
        }

        res.status(201).json({
            success: true,
            message: "Campaign saved successfully",
            campaignId: result.campaignId,
            totalEmails: result.totalEmails,
            queuedEmails: queuedCount,
            pendingEmails: result.totalEmails - queuedCount
        });

    } catch (error) {

        console.error("Scheduling error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to schedule emails"
        });
    }
}


// Get scheduled emails

export async function getScheduledEmailsController(
    req: Request,
    res: Response
) {
    try {

        const userId = (req.user as AuthUser | undefined)?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const emails = await getScheduledEmails(userId);

        res.status(200).json({
            success: true,
            total: emails.length,
            data: emails
        });

    } catch (error) {

        console.error("Scheduled emails error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve scheduled emails"
        });
    }
}


// Get sent emails

export async function getSentEmailsController(
    req: Request,
    res: Response
) {
    try {

        const userId = (req.user as AuthUser | undefined)?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const emails = await getSentEmails(userId);

        res.status(200).json({
            success: true,
            total: emails.length,
            data: emails
        });

    } catch (error) {

        console.error("Sent emails error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve sent emails"
        });
    }
}


// Get active senders

export async function getSendersController(
    req: Request,
    res: Response
) {
    try {

        const userId = (req.user as AuthUser | undefined)?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Automatically create SMTP senders if needed

        await provisionSenders(userId);

        // Retrieve the authenticated user's senders

        const senders = await getSenders(userId);

        res.status(200).json({
            success: true,
            total: senders.length,
            data: senders
        });

    } catch (error) {

        console.error("Senders error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve senders"
        });
    }
}
