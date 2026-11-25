import { Worker, DelayedError, Job } from "bullmq";
import redis from "../config/redis";
import pool from "../db/database";
import { createTransporter } from "../config/smtp";
import { EmailJobData } from "../types/email.types";
import { reserveSendingSlot } from "../services/rateLimiter.service";
import nodemailer from "nodemailer";

console.log("Initializing email worker...");

// Reschedule an email instead of dropping it
async function rescheduleEmail(
    job: Job<EmailJobData>,
    token: string | undefined,
    emailId: string,
    retryAfterMs: number,
    reason: string
) {

    const nextTime = Date.now() + retryAfterMs + 100;

    await pool.query(
        `UPDATE emails
         SET status = 'queued',
             scheduled_at = $2,
             updated_at = NOW()
         WHERE id = $1
         AND status IN ('pending', 'queued')`,
        [emailId, new Date(nextTime)]
    );

    await job.moveToDelayed(nextTime, token);

    console.log(reason);
    console.log("Email rescheduled:", emailId, new Date(nextTime));

    throw new DelayedError();
}

const emailWorker = new Worker<EmailJobData>(

    "email-queue",

    async (job, token) => {

        const { emailId } = job.data;

        if (!emailId) {
            throw new Error("Missing email ID");
        }

        const result = await pool.query(
            `SELECT
                e.*,
                c.min_delay_seconds,
                c.hourly_limit AS campaign_limit,
                s.hourly_limit AS sender_limit,
                s.email AS sender_email,
                s.name AS sender_name
             FROM emails e
             JOIN campaigns c ON e.campaign_id = c.id
             JOIN senders s ON e.sender_id = s.id
             WHERE e.id = $1
             AND e.status IN ('pending', 'queued')
             AND s.is_active = true`,
            [emailId]
        );

        if (result.rows.length === 0) {
            console.log("Email unavailable:", emailId);
            return;
        }

        const email = result.rows[0];

        const client = await pool.connect();

        let lockAcquired = false;
        let discardClient = false;

        try {

            // Acquire a sender-specific PostgreSQL lock
            const lockResult = await client.query(
                `SELECT pg_try_advisory_lock(
                    hashtextextended($1::text, 0)
                 ) AS acquired`,
                [email.sender_id]
            );

            lockAcquired = lockResult.rows[0].acquired;

            // Another worker is using this sender
            if (!lockAcquired) {

                await rescheduleEmail(
                    job,
                    token,
                    emailId,
                    1000,
                    "Sender is currently busy"
                );

                return;
            }

            // Recheck email status after acquiring the lock
            const statusResult = await client.query(
                `SELECT status
                 FROM emails
                 WHERE id = $1`,
                [emailId]
            );

            if (
                statusResult.rows.length === 0 ||
                !["pending", "queued"].includes(
                    statusResult.rows[0].status
                )
            ) {
                return;
            }

            // Check minimum sending interval
            const delayResult = await client.query(
                `SELECT
                    GREATEST(
                        0,
                        COALESCE(
                            EXTRACT(EPOCH FROM (
                                last_send_completed_at
                                - clock_timestamp()
                            )) * 1000
                            + $2::integer * 1000,
                            0
                        )
                    ) AS remaining_ms
                 FROM senders
                 WHERE id = $1`,
                [
                    email.sender_id,
                    email.min_delay_seconds
                ]
            );

            const remainingDelay = Math.ceil(
                Number(delayResult.rows[0].remaining_ms)
            );

            if (remainingDelay > 0) {

                await rescheduleEmail(
                    job,
                    token,
                    emailId,
                    remainingDelay,
                    "Minimum sending delay required"
                );

                return;
            }

            // Get sender-specific SMTP transporter
            const transporter = await createTransporter(
                email.sender_id
            );

            // Atomically check both hourly limits
            const slot = await reserveSendingSlot(
                email.sender_id,
                email.campaign_id,
                email.sender_limit,
                email.campaign_limit
            );

            if (!slot.allowed) {

                await rescheduleEmail(
                    job,
                    token,
                    emailId,
                    slot.retryAfterMs,
                    `Hourly ${slot.limitType} limit reached`
                );

                return;
            }

            // Claim the email before sending
            const claimed = await client.query(
                `UPDATE emails
                 SET status = 'sending',
                     updated_at = NOW()
                 WHERE id = $1
                 AND status IN ('pending', 'queued')
                 RETURNING id`,
                [emailId]
            );

            if (claimed.rows.length === 0) {
                return;
            }

            console.log("Processing email:", emailId);

            let info;

            try {

                info = await transporter.sendMail({
                    from: {
                        name: email.sender_name || "ReachInbox",
                        address: email.sender_email
                    },
                    to: email.recipient,
                    subject: email.subject,
                    text: email.body
                });

            } catch (error) {

                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : String(error);

                await client.query(
                    `UPDATE senders
                     SET last_send_completed_at = clock_timestamp()
                     WHERE id = $1`,
                    [email.sender_id]
                );

                await client.query(
                    `UPDATE emails
                     SET status = 'failed',
                         error_message = $2,
                         updated_at = NOW()
                     WHERE id = $1`,
                    [emailId, errorMessage]
                );

                throw error;
            }

            // Record completion time and sent status together
            await client.query("BEGIN");

            try {

                await client.query(
                    `UPDATE senders
                     SET last_send_completed_at = clock_timestamp()
                     WHERE id = $1`,
                    [email.sender_id]
                );

                await client.query(
                    `UPDATE emails
                     SET status = 'sent',
                         sent_at = clock_timestamp(),
                         error_message = NULL,
                         updated_at = NOW()
                     WHERE id = $1`,
                    [emailId]
                );

                await client.query("COMMIT");

            } catch (error) {

                await client.query("ROLLBACK");
                throw error;
            }

            console.log("Email sent successfully:", emailId);
            console.log("Message ID:", info.messageId);
            console.log(
                "Preview URL:",
                nodemailer.getTestMessageUrl(info)
            );

        } finally {

            // Always release the sender lock
            try {

                if (lockAcquired) {

                    await client.query(
                        `SELECT pg_advisory_unlock(
                            hashtextextended($1::text, 0)
                         )`,
                        [email.sender_id]
                    );
                }

            } catch (error) {

                discardClient = true;
                console.error("Lock release failed:", error);

            } finally {

                client.release(discardClient);
            }
        }
    },

    {
        connection: redis,
        concurrency: Number(
            process.env.WORKER_CONCURRENCY || 1
        )
    }
);

emailWorker.on("ready", () => {
    console.log("Email worker is ready");
});

emailWorker.on("completed", job => {
    console.log(`Job ${job.id} completed successfully`);
});

emailWorker.on("failed", async (job, error) => {

    console.error(`Job ${job?.id} failed:`, error.message);

    if (!job?.data?.emailId) {
        return;
    }

    try {

        if (await job.getState() !== "failed") {
            return;
        }

        await pool.query(
            `UPDATE emails
             SET status = 'failed',
                 error_message = $2,
                 updated_at = NOW()
             WHERE id = $1
             AND status IN ('pending', 'queued')`,
            [job.data.emailId, error.message]
        );

    } catch (dbError) {

        console.error(
            "Failed to synchronize email status:",
            dbError
        );
    }
});

emailWorker.on("error", error => {
    console.error("Email worker error:", error);
});

export default emailWorker;
