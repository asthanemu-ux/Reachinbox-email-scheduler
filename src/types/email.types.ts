export interface ScheduleEmailRequest {
    senderId: string;
    recipients: string[];
    subject: string;
    body: string;
    startTime: string;
    minDelaySeconds: number;
    hourlyLimit: number;
}

export interface EmailJobData {
    emailId: string;
}

export type EmailStatus =
    | "pending"
    | "queued"
    | "sending"
    | "sent"
    | "failed"
    | "cancelled";