
import { Mail } from "lucide-react";
import type { Email } from "../types";

interface EmailTableProps {
    emails: Email[];
    activeTab: "scheduled" | "sent";
}

function formatDate(value?: string | null) {

    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN");
}

function getStatusStyle(status: string) {

    switch (status) {

        case "sent":
            return "bg-green-100 text-green-700";

        case "failed":
            return "bg-red-100 text-red-700";

        case "queued":
            return "bg-orange-100 text-orange-700";

        case "sending":
            return "bg-blue-100 text-blue-700";

        default:
            return "bg-slate-100 text-slate-600";
    }
}

export default function EmailTable({
    emails,
    activeTab
}: EmailTableProps) {

    if (emails.length === 0) {

        return (
            <div className="bg-white border border-slate-200 rounded-xl min-h-80 flex flex-col items-center justify-center">

                <div className="bg-green-50 rounded-full p-5 mb-4">
                    <Mail size={32} className="text-green-600" />
                </div>

                <h2 className="text-lg font-semibold text-slate-800">
                    No {activeTab} emails yet
                </h2>

                <p className="text-sm text-slate-500 mt-2">
                    {activeTab === "scheduled"
                        ? "Compose and schedule your first email campaign."
                        : "Processed emails will appear here."}
                </p>

            </div>
        );
    }

    return (

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">

            <table className="w-full text-left text-sm">

                <thead className="bg-slate-50 text-slate-500">

                    <tr>
                        <th className="px-5 py-4 font-medium">
                            Recipient
                        </th>

                        <th className="px-5 py-4 font-medium">
                            Subject
                        </th>

                        <th className="px-5 py-4 font-medium">
                            Sender
                        </th>

                        <th className="px-5 py-4 font-medium">
                            {activeTab === "scheduled"
                                ? "Scheduled Time"
                                : "Sent Time"}
                        </th>

                        <th className="px-5 py-4 font-medium">
                            Status
                        </th>
                    </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                    {emails.map(email => (

                        <tr
                            key={email.id}
                            className="hover:bg-slate-50"
                        >

                            <td className="px-5 py-4 font-medium text-slate-800">
                                {email.recipient}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                                {email.subject}
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                                {email.sender_email}
                            </td>

                            <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                                {formatDate(
                                    activeTab === "scheduled"
                                        ? email.scheduled_at
                                        : email.sent_at
                                )}
                            </td>

                            <td className="px-5 py-4">

                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(email.status)}`}
                                    title={email.error_message || ""}
                                >
                                    {email.status}
                                </span>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );
}
