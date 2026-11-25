export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
}

export interface Email {
    id: string;
    recipient: string;
    subject: string;
    status: string;
    scheduled_at: string;
    sent_at?: string | null;
    sender_email: string;
    error_message?: string | null;
}

export interface Sender {
    id: string;
    name: string;
    email: string;
    hourly_limit: number;
    is_active: boolean;
}