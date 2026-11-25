import pool from "../db/database";
import emailQueue from "../queues/emailQueue";

export async function recoverEmails() {

    console.log("Starting email recovery...");

    const result = await pool.query(
        `SELECT id, status, scheduled_at
         FROM emails
         WHERE status IN ('pending', 'queued')
         ORDER BY scheduled_at ASC`
    );

    let recoveredCount = 0;

    for (const email of result.rows) {

        try {

            const existingJob = await emailQueue.getJob(
                email.id
            );

            if (existingJob) {

                const state = await existingJob.getState();

                if (state === "failed") {

                    await pool.query(
                        `UPDATE emails
                         SET status = 'failed',
                             error_message = $2,
                             updated_at = NOW()
                         WHERE id = $1
                         AND status IN ('pending', 'queued')`,
                        [
                            email.id,
                            existingJob.failedReason ||
                            "Queue job failed"
                        ]
                    );

                } else if (state === "completed") {

                    console.warn(
                        "Completed job requires reconciliation:",
                        email.id
                    );

                } else {

                    await pool.query(
                        `UPDATE emails
                         SET status = 'queued',
                             updated_at = NOW()
                         WHERE id = $1
                         AND status = 'pending'`,
                        [email.id]
                    );
                }

                continue;
            }

            const delay = Math.max(
                0,
                new Date(email.scheduled_at).getTime()
                    - Date.now()
            );

            await emailQueue.add(
                "send-email",
                {
                    emailId: email.id
                },
                {
                    jobId: email.id,
                    delay,
                    removeOnComplete: false,
                    removeOnFail: false
                }
            );

            await pool.query(
                `UPDATE emails
                 SET status = 'queued',
                     updated_at = NOW()
                 WHERE id = $1
                 AND status IN ('pending', 'queued')`,
                [email.id]
            );

            recoveredCount++;

            console.log("Recovered email:", email.id);

        } catch (error) {

            console.error(
                "Email recovery failed:",
                email.id,
                error
            );
        }
    }

    const interrupted = await pool.query(
        `SELECT id FROM emails
         WHERE status = 'sending'`
    );

    for (const email of interrupted.rows) {

        console.warn(
            "Sending email requires reconciliation:",
            email.id
        );
    }

    console.log(
        `Email recovery completed. Restored ${recoveredCount} jobs.`
    );
}