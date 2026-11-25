import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const algorithm = "aes-256-gcm";

function getKey(): Buffer {

    const key = process.env.SMTP_ENCRYPTION_KEY;

    if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
        throw new Error("Invalid SMTP encryption key");
    }

    return Buffer.from(key, "hex");
}

export function encrypt(text: string): string {

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        algorithm,
        getKey(),
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted.toString("hex")
    ].join(":");
}

export function decrypt(value: string): string {

    const [iv, authTag, encrypted] = value.split(":");

    const decipher = crypto.createDecipheriv(
        algorithm,
        getKey(),
        Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(
        Buffer.from(authTag, "hex")
    );

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, "hex")),
        decipher.final()
    ]);

    return decrypted.toString("utf8");
}