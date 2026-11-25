import pool from "../db/database";
import { randomUUID } from "crypto";
import { ScheduleEmailRequest } from "../types/email.types";

export async function scheduleEmails(
    userId: string,
    data: ScheduleEmailRequest
) {
    const client = await pool.connect();

    const campaignId = randomUUID();
    const emailIds: string[] = [];

    try {
        await client.query("BEGIN");

        const sender = await client.query(
            `SELECT id FROM senders
             WHERE id = $1
             AND user_id = $2
             AND is_active = true`,
            [data.senderId, userId]
        );

        if (sender.rows.length === 0) {
            throw new Error("Invalid or inactive sender");
        }

        await client.query(
            `INSERT INTO campaigns
            (id, user_id, subject, body, start_time,
             min_delay_seconds, hourly_limit, status,
             created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7,
                    'scheduled', NOW(), NOW())`,
            [
                campaignId,
                userId,
                data.subject,
                data.body,
                data.startTime,
                data.minDelaySeconds,
                data.hourlyLimit
            ]
        );

        for (let i = 0; i < data.recipients.length; i++) {

            const emailId = randomUUID();

            const scheduledAt = new Date(
                new Date(data.startTime).getTime() +
                i * data.minDelaySeconds * 1000
            );

            await client.query(
                `INSERT INTO emails
                (id, campaign_id, sender_id, recipient,
                 subject, body, status, scheduled_at,
                 idempotency_key, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6,
                        'pending', $7, $8, NOW(), NOW())`,
                [
                    emailId,
                    campaignId,
                    data.senderId,
                    data.recipients[i],
                    data.subject,
                    data.body,
                    scheduledAt,
                    emailId
                ]
            );

            emailIds.push(emailId);
        }

        await client.query("COMMIT");

        return {
            campaignId,
            emailIds,
            totalEmails: emailIds.length
        };

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }
}

// Get all scheduled emails

export async function getScheduledEmails(userId: string) {

    const result = await pool.query(
        `SELECT
            e.id,
            e.recipient,
            e.subject,
            e.status,
            e.scheduled_at,
            s.email AS sender_email
         FROM emails e
         JOIN campaigns c ON e.campaign_id = c.id
         JOIN senders s ON e.sender_id = s.id
         WHERE c.user_id = $1
         AND e.status IN ('pending', 'queued', 'sending')
         ORDER BY e.scheduled_at ASC`,
        [userId]
    );

    return result.rows;
}

// Get all sent and failed emails

export async function getSentEmails(userId: string) {

    const result = await pool.query(
        `SELECT
            e.id,
            e.recipient,
            e.subject,
            e.status,
            e.sent_at,
            e.scheduled_at,
            e.error_message,
            s.email AS sender_email
         FROM emails e
         JOIN campaigns c ON e.campaign_id = c.id
         JOIN senders s ON e.sender_id = s.id
         WHERE c.user_id = $1
         AND e.status IN ('sent', 'failed')
         ORDER BY e.updated_at DESC`,
        [userId]
    );

    return result.rows;
}

// Get all active senders

export async function getSenders(userId: string) {

    const result = await pool.query(
        `SELECT
            id,
            name,
            email,
            hourly_limit,
            is_active
         FROM senders
         WHERE user_id = $1
         AND is_active = true
         ORDER BY created_at ASC`,
        [userId]
    );

    return result.rows;
}
