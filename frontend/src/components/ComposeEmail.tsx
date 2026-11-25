
import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";

import {
    X,
    Upload,
    Calendar,
    Send,
    AlertCircle,
    CheckCircle
} from "lucide-react";

import Papa from "papaparse";
import axios from "axios";

import api from "../services/api";
import type { Sender } from "../types";

interface ComposeEmailProps {
    senders: Sender[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function ComposeEmail({
    senders,
    onClose,
    onSuccess
}: ComposeEmailProps) {

    const [senderId, setSenderId] = useState(
        senders[0]?.id || ""
    );

    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [recipientText, setRecipientText] = useState("");
    const [startTime, setStartTime] = useState("");

    const [minDelaySeconds, setMinDelaySeconds] = useState(5);
    const [hourlyLimit, setHourlyLimit] = useState(100);

    const [fileName, setFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    // Extract and remove duplicate email addresses

    const enteredEmails = recipientText
        .split(/[\s,;]+/)
        .map(email => email.trim())
        .filter(Boolean);

    const recipients = [
        ...new Set(
            enteredEmails.filter(email => emailRegex.test(email))
        )
    ];

    const invalidCount = enteredEmails.filter(
        email => !emailRegex.test(email)
    ).length;


    // Handle CSV upload

    const handleCSVUpload = (
        event: ChangeEvent<HTMLInputElement>
    ) => {

        const file = event.target.files?.[0];

        if (!file) return;

        setFileName(file.name);
        setError("");

        Papa.parse<string[]>(file, {

            skipEmptyLines: true,

            complete: (results) => {

                if (results.errors.length > 0) {
                    setError("The CSV file could not be parsed correctly.");
                    return;
                }

                const extractedEmails = results.data
                    .flat()
                    .map(value => value.trim())
                    .filter(value => emailRegex.test(value));

                if (extractedEmails.length === 0) {
                    setError("No valid email addresses found in the CSV.");
                    return;
                }

                setRecipientText(previous => {

                    const existing = previous
                        .split(/[\s,;]+/)
                        .filter(Boolean);

                    return [
                        ...new Set([
                            ...existing,
                            ...extractedEmails
                        ])
                    ].join("\n");

                });

            },

            error: () => {
                setError("Unable to read the CSV file.");
            }

        });
    };


    // Schedule emails through backend API

    const handleSubmit = async (event: FormEvent) => {

        event.preventDefault();

        setError("");
        setSuccess("");

        if (!senderId || !subject.trim() || !body.trim()) {
            setError("Please complete all required fields.");
            return;
        }

        if (recipients.length === 0 || invalidCount > 0) {
            setError("Please provide valid recipient email addresses.");
            return;
        }

        const scheduledDate = new Date(startTime);

        if (
            !Number.isFinite(scheduledDate.getTime()) ||
            scheduledDate.getTime() <= Date.now()
        ) {
            setError("Please select a future start time.");
            return;
        }

        if (
            !Number.isInteger(minDelaySeconds) ||
            minDelaySeconds < 0 ||
            !Number.isInteger(hourlyLimit) ||
            hourlyLimit <= 0
        ) {
            setError("Please enter a valid delay and hourly limit.");
            return;
        }

        try {

            setLoading(true);

            const response = await api.post("/emails/schedule", {

                senderId,
                recipients,
                subject: subject.trim(),
                body,
                startTime: scheduledDate.toISOString(),
                minDelaySeconds,
                hourlyLimit

            });

            const result = response.data;

            setSuccess(
                `${result.totalEmails} emails saved. ` +
                `${result.queuedEmails} queued, ` +
                `${result.pendingEmails} pending.`
            );

            onSuccess();

        } catch (error) {

            if (axios.isAxiosError(error)) {

                setError(
                    error.response?.data?.message ||
                    "Failed to schedule emails."
                );

            } else {

                setError("Something went wrong.");

            }

        } finally {

            setLoading(false);

        }
    };


    const inputStyle =
        "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white";


    return (

        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="compose-title"
                className="bg-white w-full max-w-2xl rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto"
            >

                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                    <div>
                        <h2 id="compose-title" className="text-xl font-bold">
                            Compose New Email
                        </h2>

                        <p className="text-sm text-slate-500 mt-1">
                            Create and schedule your email campaign
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close compose form"
                        className="text-slate-500 hover:text-slate-800"
                    >
                        <X size={24} />
                    </button>

                </div>


                <form
                    onSubmit={handleSubmit}
                    className="p-6 space-y-5"
                >

                    {/* Select sender */}

                    <div>

                        <label className="block text-sm font-semibold mb-2">
                            From
                        </label>

                        <select
                            value={senderId}
                            onChange={e => setSenderId(e.target.value)}
                            className={inputStyle}
                            required
                        >

                            <option value="">Select sender</option>

                            {senders.map(sender => (

                                <option
                                    key={sender.id}
                                    value={sender.id}
                                >
                                    {sender.name} — {sender.email}
                                </option>

                            ))}

                        </select>

                    </div>


                    {/* Recipients and CSV upload */}

                    <div>

                        <div className="flex items-center justify-between mb-2">

                            <label className="text-sm font-semibold">
                                Recipients
                            </label>

                            <span className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
                                {recipients.length} recipients
                            </span>

                        </div>

                        <textarea
                            value={recipientText}
                            onChange={e => setRecipientText(e.target.value)}
                            placeholder="Enter email addresses separated by commas or new lines"
                            rows={4}
                            className={inputStyle}
                            required
                        />

                        {invalidCount > 0 && (
                            <p className="text-xs text-red-600 mt-1">
                                {invalidCount} invalid email addresses
                            </p>
                        )}

                        <label className="mt-3 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-600 hover:bg-green-50 hover:border-green-500 cursor-pointer">

                            <Upload size={18} />

                            {fileName || "Upload CSV file"}

                            <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleCSVUpload}
                                className="hidden"
                            />

                        </label>

                    </div>


                    {/* Email subject */}

                    <div>

                        <label className="block text-sm font-semibold mb-2">
                            Subject
                        </label>

                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Enter email subject"
                            className={inputStyle}
                            required
                        />

                    </div>


                    {/* Email body */}

                    <div>

                        <label className="block text-sm font-semibold mb-2">
                            Email Body
                        </label>

                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            placeholder="Write your email message..."
                            rows={5}
                            className={inputStyle}
                            required
                        />

                    </div>


                    {/* Scheduling configuration */}

                    <div className="border-t border-slate-200 pt-5">

                        <div className="flex items-center gap-2 mb-4">

                            <Calendar
                                size={20}
                                className="text-green-600"
                            />

                            <h3 className="font-semibold">
                                Scheduling Settings
                            </h3>

                        </div>

                        <div className="mb-4">

                            <label className="block text-sm font-semibold mb-2">
                                Start Date and Time
                            </label>

                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className={inputStyle}
                                required
                            />

                        </div>

                        <div className="grid grid-cols-2 gap-4">

                            <div>

                                <label className="block text-sm font-semibold mb-2">
                                    Delay Between Emails (seconds)
                                </label>

                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={minDelaySeconds}
                                    onChange={e =>
                                        setMinDelaySeconds(Number(e.target.value))
                                    }
                                    className={inputStyle}
                                    required
                                />

                            </div>

                            <div>

                                <label className="block text-sm font-semibold mb-2">
                                    Hourly Limit
                                </label>

                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={hourlyLimit}
                                    onChange={e =>
                                        setHourlyLimit(Number(e.target.value))
                                    }
                                    className={inputStyle}
                                    required
                                />

                            </div>

                        </div>

                    </div>


                    {/* Error and success messages */}

                    {error && (

                        <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm">

                            <AlertCircle size={20} />

                            {error}

                        </div>

                    )}

                    {success && (

                        <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-lg text-sm">

                            <CheckCircle size={20} />

                            {success}

                        </div>

                    )}


                    {/* Action buttons */}

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="border border-slate-300 px-5 py-2.5 rounded-lg text-sm"
                        >
                            {success ? "Close" : "Cancel"}
                        </button>

                        <button
                            type="submit"
                            disabled={loading || !!success || recipients.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                        >

                            <Send size={17} />

                            {loading
                                ? "Scheduling..."
                                : `Schedule ${recipients.length} Emails`}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );
}
