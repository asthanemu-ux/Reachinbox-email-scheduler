import nodemailer from "nodemailer";
import pool from "../db/database";
import { randomUUID } from "crypto";
import { encrypt } from "../utils/encryption";

export async function provisionSenders(userId: string) {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        // Prevent simultaneous provisioning for the same user

        await client.query(
            `SELECT pg_advisory_xact_lock(
                hashtextextended($1::text, 0)
            )`,
            [`provision:${userId}`]
        );

        // Check existing senders

        const existing = await client.query(
            `SELECT id, smtp_user
             FROM senders
             WHERE user_id = $1`,
            [userId]
        );

        const usedAccounts = new Set(
            existing.rows.map(row => row.smtp_user)
        );

        if (existing.rows.length >= 2) {
            await client.query("COMMIT");
            return;
        }

        // Create independent Ethereal accounts

        for (let i = existing.rows.length; i < 2; i++) {

            const account = await nodemailer.createTestAccount();

            if (usedAccounts.has(account.user)) {
                throw new Error(
                    "Duplicate Ethereal account received"
                );
            }

            usedAccounts.add(account.user);

            await client.query(
                `INSERT INTO senders (
                    id,
                    user_id,
                    name,
                    email,
                    hourly_limit,
                    is_active,
                    smtp_host,
                    smtp_port,
                    smtp_user,
                    smtp_password,
                    smtp_secure,
                    created_at,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5, true,
                    $6, $7, $8, $9, $10,
                    NOW(), NOW()
                )`,
                [
                    randomUUID(),
                    userId,
                    `Sender ${i + 1}`,
                    account.user,
                    100,
                    account.smtp.host,
                    account.smtp.port,
                    account.user,
                    encrypt(account.pass),
                    account.smtp.secure
                ]
            );

        }

        await client.query("COMMIT");

        console.log("SMTP senders provisioned for:", userId);

    } catch (error) {

        await client.query("ROLLBACK");

        throw error;

    } finally {

        client.release();

    }
}