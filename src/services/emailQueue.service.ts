import pool from "../db/database";
import emailQueue from "../queues/emailQueue";
import { EmailJobData } from "../types/email.types";

export async function enqueueEmail(emailId: string) {

    const result = await pool.query(
        `SELECT id, scheduled_at
         FROM emails
         WHERE id = $1 AND status = 'pending'`,
        [emailId]
    );

    if (result.rows.length === 0) {
        return;
    }

    const email = result.rows[0];

    const delay = Math.max(
        0,
        new Date(email.scheduled_at).getTime() - Date.now()
    );

    const jobData: EmailJobData = {
        emailId: email.id
    };

    await emailQueue.add("send-email", jobData, {
        jobId: email.id,
        delay: delay,
        removeOnComplete: false,
        removeOnFail: false
    });

    await pool.query(
        `UPDATE emails
         SET status = 'queued', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'`,
        [emailId]
    );

    console.log("Email added to queue:", emailId);
}