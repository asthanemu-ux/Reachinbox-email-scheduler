import nodemailer from "nodemailer";
import dotenv from "dotenv";
import pool from "../db/database";
import { encrypt } from "../utils/encryption";

dotenv.config();

async function setupSenders() {

    try {

        const userId = process.env.TEST_USER_ID;
        const senderId = process.env.TEST_SENDER_ID;

        if (!userId || !senderId) {
            throw new Error("Test user or sender ID missing");
        }

        // Find sender 1
        const existing = await pool.query(
            `SELECT id, smtp_user
             FROM senders
             WHERE id = $1 AND user_id = $2`,
            [senderId, userId]
        );

        if (existing.rows.length === 0) {
            throw new Error("Test sender not found");
        }

        // Configure sender 1 if required
        if (!existing.rows[0].smtp_user) {

            const account = await nodemailer.createTestAccount();

            await pool.query(
                `UPDATE senders
                 SET smtp_host = $2,
                     smtp_port = $3,
                     smtp_user = $4,
                     smtp_password = $5,
                     smtp_secure = $6,
                     updated_at = NOW()
                 WHERE id = $1`,
                [
                    senderId,
                    account.smtp.host,
                    account.smtp.port,
                    account.user,
                    encrypt(account.pass),
                    account.smtp.secure
                ]
            );

            console.log("Sender 1 configured successfully");

            console.log("Run this script again to configure sender 2");
            return;

        } else {

            console.log("Sender 1 already configured");
        }

        // Find sender 2
        const secondSender = await pool.query(
            `SELECT id, smtp_user
             FROM senders
             WHERE user_id = $1 AND name = $2`,
            [userId, "ReachInbox Sender 2"]
        );

        if (secondSender.rows.length === 0) {
            throw new Error("Second sender not found");
        }

        // Configure sender 2 if missing or duplicated
        if (
            !secondSender.rows[0].smtp_user ||
            secondSender.rows[0].smtp_user === existing.rows[0].smtp_user
        ) {

            const account = await nodemailer.createTestAccount();

            if (account.user === existing.rows[0].smtp_user) {
                throw new Error("Duplicate SMTP account received");
            }

            await pool.query(
                `UPDATE senders
                 SET email = $2,
                     smtp_host = $3,
                     smtp_port = $4,
                     smtp_user = $5,
                     smtp_password = $6,
                     smtp_secure = $7,
                     updated_at = NOW()
                 WHERE id = $1`,
                [
                    secondSender.rows[0].id,
                    account.user,
                    account.smtp.host,
                    account.smtp.port,
                    account.user,
                    encrypt(account.pass),
                    account.smtp.secure
                ]
            );

            console.log("Sender 2 configured successfully");

        } else {

            console.log("Sender 2 already configured");
        }

        console.log("SMTP sender setup completed");

    } catch (error) {

        console.error("Sender setup failed:", error);
        process.exitCode = 1;

    } finally {

        await pool.end();
    }
}

setupSenders();