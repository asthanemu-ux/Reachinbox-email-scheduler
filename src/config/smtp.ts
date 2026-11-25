import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import pool from "../db/database";
import { decrypt } from "../utils/encryption";

const transporters = new Map<string, Promise<Transporter>>();

export async function createTransporter(
    senderId: string
): Promise<Transporter> {

    let transporter = transporters.get(senderId);

    if (!transporter) {

        transporter = initializeTransporter(senderId)
            .catch(error => {
                transporters.delete(senderId);
                throw error;
            });

        transporters.set(senderId, transporter);
    }

    return transporter;
}

async function initializeTransporter(
    senderId: string
): Promise<Transporter> {

    const result = await pool.query(
        `SELECT smtp_host,
                smtp_port,
                smtp_user,
                smtp_password,
                smtp_secure
         FROM senders
         WHERE id = $1 AND is_active = true`,
        [senderId]
    );

    if (result.rows.length === 0) {
        throw new Error("Active SMTP sender not found");
    }

    const sender = result.rows[0];

    if (!sender.smtp_user || !sender.smtp_password) {
        throw new Error("SMTP credentials not configured");
    }

    const transporter = nodemailer.createTransport({
        host: sender.smtp_host,
        port: sender.smtp_port,
        secure: sender.smtp_secure,
        requireTLS: !sender.smtp_secure,

        pool: true,
        maxConnections: 1,

        auth: {
            user: sender.smtp_user,
            pass: decrypt(sender.smtp_password)
        },

        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000
    });

    try {
        await transporter.verify();

        console.log("SMTP connected for sender:", senderId);

        return transporter;

    } catch (error) {
        transporter.close();
        throw error;
    }
}