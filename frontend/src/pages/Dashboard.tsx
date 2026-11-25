
import { useEffect, useState, useCallback, useRef } from "react";

import {
    Clock,
    Send,
    Mail,
    RefreshCw,
    AlertCircle,
    Search,
    Filter,
    X,
    Inbox,
    CheckCircle
} from "lucide-react";

import ComposeEmail from "../components/ComposeEmail";
import Sidebar from "../components/Sidebar";
import EmailTable from "../components/EmailTable";

import api from "../services/api";

import type { User, Email, Sender } from "../types";

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

export default function Dashboard({
    user,
    onLogout
}: DashboardProps) {

    const [showCompose, setShowCompose] = useState(false);

    const [activeTab, setActiveTab] =
        useState<"scheduled" | "sent">("scheduled");

    const [scheduledEmails, setScheduledEmails] =
        useState<Email[]>([]);

    const [sentEmails, setSentEmails] =
        useState<Email[]>([]);

    const [senders, setSenders] =
        useState<Sender[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    // Search and filtering

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [lastUpdated, setLastUpdated] =
        useState<Date | null>(null);

    const requestInProgress = useRef(false);


    // Retrieve actual data from the backend

    const fetchData = useCallback(async () => {

        if (requestInProgress.current) return;

        requestInProgress.current = true;

        try {

            setRefreshing(true);

            const [
                scheduledResponse,
                sentResponse,
                sendersResponse
            ] = await Promise.all([

                api.get("/emails/scheduled"),
                api.get("/emails/sent"),
                api.get("/emails/senders")

            ]);

            setScheduledEmails(
                scheduledResponse.data.data
            );

            setSentEmails(
                sentResponse.data.data
            );

            setSenders(
                sendersResponse.data.data
            );

            setLastUpdated(new Date());
            setError("");

        } catch (error) {

            console.error("Dashboard error:", error);

            setError(
                "Unable to load dashboard data. Please try again."
            );

        } finally {

            setLoading(false);
            setRefreshing(false);
            requestInProgress.current = false;

        }

    }, []);


    // Automatic refresh every five seconds

    useEffect(() => {

        void fetchData();

        const interval = setInterval(fetchData, 5000);

        return () => clearInterval(interval);

    }, [fetchData]);


    // Reset filters when switching tabs

    const handleTabChange = (
        tab: "scheduled" | "sent"
    ) => {

        setActiveTab(tab);
        setSearchQuery("");
        setStatusFilter("all");

    };


    // Dashboard statistics

    const successfulEmails = sentEmails.filter(
        email => email.status === "sent"
    ).length;

    const failedEmails = sentEmails.filter(
        email => email.status === "failed"
    ).length;

    const displayedEmails =
        activeTab === "scheduled"
            ? scheduledEmails
            : sentEmails;


    // Search and status filtering

    const filteredEmails = displayedEmails.filter(email => {

        const query = searchQuery.trim().toLowerCase();

        const matchesSearch =
            email.recipient.toLowerCase().includes(query) ||
            email.subject.toLowerCase().includes(query) ||
            (email.sender_email || "")
                .toLowerCase()
                .includes(query);

        const matchesStatus =
            statusFilter === "all" ||
            email.status === statusFilter;

        return matchesSearch && matchesStatus;

    });


    return (

        <div className="flex min-h-screen bg-slate-50">

            <Sidebar
                user={user}
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                onCompose={() => setShowCompose(true)}
                onLogout={onLogout}
            />

            <main className="flex-1 min-w-0">

                {/* Dashboard Header */}

                <header className="bg-white border-b border-slate-200 px-6 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4">

                    <div>

                        <h1 className="text-2xl font-bold text-slate-900">

                            {activeTab === "scheduled"
                                ? "Scheduled Emails"
                                : "Sent Emails"}

                        </h1>

                        <p className="text-sm text-slate-500 mt-1">
                            Manage and track your email campaigns
                        </p>

                    </div>

                    <div className="flex items-center gap-4">

                        {lastUpdated && !error && (

                            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">

                                <span className="w-2 h-2 rounded-full bg-green-500" />

                                Updated {lastUpdated.toLocaleTimeString()}

                            </div>

                        )}

                        <button
                            onClick={fetchData}
                            disabled={refreshing}
                            className="flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >

                            <RefreshCw
                                size={16}
                                className={
                                    refreshing ? "animate-spin" : ""
                                }
                            />

                            Refresh

                        </button>

                    </div>

                </header>


                <div className="p-4 md:p-8">

                    {/* Statistics Cards */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

                        {/* Scheduled Emails */}

                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">

                            <div className="flex items-center justify-between mb-4">

                                <div className="bg-orange-50 text-orange-500 p-3 rounded-xl">

                                    <Clock size={24} />

                                </div>

                                <span className="text-xs text-orange-600 bg-orange-50 rounded-full px-3 py-1">
                                    In Queue
                                </span>

                            </div>

                            <p className="text-sm text-slate-500">
                                Scheduled Emails
                            </p>

                            <p className="text-3xl font-bold text-slate-900 mt-2">

                                {loading
                                    ? "—"
                                    : scheduledEmails.length}

                            </p>

                            <p className="text-xs text-slate-400 mt-2">
                                Waiting or being processed
                            </p>

                        </div>


                        {/* Sent Emails */}

                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">

                            <div className="flex items-center justify-between mb-4">

                                <div className="bg-green-50 text-green-600 p-3 rounded-xl">

                                    <Send size={24} />

                                </div>

                                <span className="text-xs text-green-600 bg-green-50 rounded-full px-3 py-1">
                                    Processed
                                </span>

                            </div>

                            <p className="text-sm text-slate-500">
                                Sent Emails
                            </p>

                            <p className="text-3xl font-bold text-slate-900 mt-2">

                                {loading ? "—" : successfulEmails}

                            </p>

                            <div className="flex items-center gap-1 mt-2">

                                {failedEmails === 0 ? (

                                    <>

                                        <CheckCircle
                                            size={14}
                                            className="text-green-600"
                                        />

                                        <p className="text-xs text-green-600">
                                            0 failed
                                        </p>

                                    </>

                                ) : (

                                    <p className="text-xs text-red-500">
                                        {failedEmails} failed
                                    </p>

                                )}

                            </div>

                        </div>


                        {/* Active Senders */}

                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">

                            <div className="flex items-center justify-between mb-4">

                                <div className="bg-blue-50 text-blue-500 p-3 rounded-xl">

                                    <Mail size={24} />

                                </div>

                                <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-3 py-1">
                                    SMTP
                                </span>

                            </div>

                            <p className="text-sm text-slate-500">
                                Active Senders
                            </p>

                            <p className="text-3xl font-bold text-slate-900 mt-2">

                                {loading ? "—" : senders.length}

                            </p>

                            <p className="text-xs text-slate-400 mt-2">
                                Configured sender accounts
                            </p>

                        </div>

                    </div>


                    {/* Error Message */}

                    {error && (

                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-5 flex items-center gap-2">

                            <AlertCircle size={20} />

                            {error}

                        </div>

                    )}


                    {/* Search and Filter Toolbar */}

                    <div className="flex flex-wrap items-center gap-3 mb-5">

                        <div className="relative flex-1 min-w-[220px]">

                            <Search
                                size={19}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e =>
                                    setSearchQuery(e.target.value)
                                }
                                placeholder="Search recipient, subject or sender..."
                                aria-label="Search emails"
                                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500"
                            />

                            {searchQuery && (

                                <button
                                    onClick={() => setSearchQuery("")}
                                    aria-label="Clear search"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                >

                                    <X size={18} />

                                </button>

                            )}

                        </div>


                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3">

                            <Filter
                                size={17}
                                className="text-slate-500"
                            />

                            <select
                                value={statusFilter}
                                onChange={e =>
                                    setStatusFilter(e.target.value)
                                }
                                aria-label="Filter by status"
                                className="bg-white py-3 text-sm text-slate-700 outline-none"
                            >

                                <option value="all">
                                    All Statuses
                                </option>

                                {activeTab === "scheduled" ? (

                                    <>

                                        <option value="pending">
                                            Pending
                                        </option>

                                        <option value="queued">
                                            Queued
                                        </option>

                                        <option value="sending">
                                            Sending
                                        </option>

                                    </>

                                ) : (

                                    <>

                                        <option value="sent">
                                            Sent
                                        </option>

                                        <option value="failed">
                                            Failed
                                        </option>

                                    </>

                                )}

                            </select>

                        </div>

                    </div>


                    {/* Loading State */}

                    {loading ? (

                        <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-24">

                            <RefreshCw
                                size={30}
                                className="animate-spin text-green-600"
                            />

                            <p className="text-sm text-slate-500 mt-4">
                                Loading your emails...
                            </p>

                        </div>

                    ) : error && displayedEmails.length === 0 ? (

                        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">

                            <p className="text-slate-600">
                                Email data is currently unavailable.
                            </p>

                            <button
                                onClick={fetchData}
                                className="mt-4 text-green-600 font-medium text-sm"
                            >
                                Try again
                            </button>

                        </div>

                    ) : filteredEmails.length === 0 &&
                        (searchQuery || statusFilter !== "all") ? (

                        /* No Matching Search Results */

                        <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-20">

                            <div className="bg-slate-100 rounded-full p-5 mb-4">

                                <Inbox
                                    size={32}
                                    className="text-slate-400"
                                />

                            </div>

                            <h3 className="text-lg font-semibold text-slate-800">
                                No matching emails
                            </h3>

                            <p className="text-sm text-slate-500 mt-2">
                                Try a different search or status filter.
                            </p>

                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("all");
                                }}
                                className="mt-5 text-sm font-medium text-green-600 hover:text-green-800"
                            >
                                Clear filters
                            </button>

                        </div>

                    ) : (

                        /* Email Table */

                        <EmailTable
                            emails={filteredEmails}
                            activeTab={activeTab}
                        />

                    )}


                    {/* Table Result Count */}

                    {!loading && !error && (

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 px-1">

                            <p className="text-sm text-slate-500">

                                Showing {filteredEmails.length} of{" "}
                                {displayedEmails.length} emails

                            </p>

                            <p className="text-xs text-slate-400 flex items-center gap-2">

                                <RefreshCw size={13} />

                                Auto-refresh every 5 seconds

                            </p>

                        </div>

                    )}

                </div>

            </main>


            {/* Compose Modal */}

            {showCompose && (

                <ComposeEmail
                    senders={senders}
                    onClose={() => setShowCompose(false)}
                    onSuccess={() => {

                        handleTabChange("scheduled");

                        void fetchData();

                    }}
                />

            )}

        </div>

    );
}
