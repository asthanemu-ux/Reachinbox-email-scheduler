

import { useState } from "react";

import {
    Mail,
    Clock,
    Send,
    Plus,
    LogOut,
    LayoutDashboard,
    ExternalLink
} from "lucide-react";

import type { User } from "../types";

interface SidebarProps {
    user: User;
    activeTab: "scheduled" | "sent";
    setActiveTab: (tab: "scheduled" | "sent") => void;
    onCompose: () => void;
    onLogout: () => void;
}

export default function Sidebar({
    user,
    activeTab,
    setActiveTab,
    onCompose,
    onLogout
}: SidebarProps) {

    const [avatarFailed, setAvatarFailed] = useState(false);

    const initials = user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(name => name.charAt(0).toUpperCase())
        .join("") || "U";

    return (

        <aside className="w-64 h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">

            {/* Application Logo */}

            <div className="flex items-center gap-3 px-6 py-7">

                <div className="bg-green-600 text-white rounded-xl p-2.5 shadow-sm">
                    <Mail size={24} />
                </div>

                <div>

                    <h1 className="text-xl font-bold text-slate-900">
                        ReachInbox
                    </h1>

                    <p className="text-xs text-slate-400 mt-0.5">
                        Email Scheduler
                    </p>

                </div>

            </div>


            {/* Compose Button */}

            <div className="px-4 mb-8">

                <button
                    onClick={onCompose}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-medium shadow-sm transition-colors"
                >
                    <Plus size={21} />
                    Compose
                </button>

            </div>


            {/* Email Navigation */}

            <nav className="px-4 space-y-2">

                <p className="text-xs font-semibold tracking-wider text-slate-400 px-3 mb-3">
                    EMAILS
                </p>

                <button
                    onClick={() => setActiveTab("scheduled")}
                    aria-current={
                        activeTab === "scheduled" ? "page" : undefined
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        activeTab === "scheduled"
                            ? "bg-green-50 text-green-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    <Clock size={19} />
                    Scheduled
                </button>

                <button
                    onClick={() => setActiveTab("sent")}
                    aria-current={
                        activeTab === "sent" ? "page" : undefined
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        activeTab === "sent"
                            ? "bg-green-50 text-green-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    <Send size={19} />
                    Sent
                </button>

            </nav>


            {/* Queue Monitoring */}

            <div className="px-4 mt-8">

                <p className="text-xs font-semibold tracking-wider text-slate-400 px-3 mb-3">
                    ADMINISTRATION
                </p>

                <a
                    href="http://localhost:5000/admin/queues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >

                    <LayoutDashboard size={19} />

                    <span className="flex-1">
                        Queue Monitor
                    </span>

                    <ExternalLink
                        size={14}
                        className="text-slate-400"
                    />

                </a>

                <p className="text-xs text-slate-400 px-4 mt-1">
                    Administrator access only
                </p>

            </div>


            {/* User Profile */}

            <div className="mt-auto border-t border-slate-200 p-4">

                <div className="flex items-center gap-3 mb-4">

                    {user.avatar && !avatarFailed ? (

                        <img
                            src={user.avatar}
                            alt="Google profile"
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarFailed(true)}
                        />

                    ) : (

                        <div className="w-11 h-11 rounded-full bg-green-700 text-white flex items-center justify-center font-semibold shrink-0">
                            {initials}
                        </div>

                    )}

                    <div className="min-w-0">

                        <p className="font-semibold text-sm text-slate-900 truncate">
                            {user.name}
                        </p>

                        <p
                            title={user.email}
                            className="text-xs text-slate-500 truncate"
                        >
                            {user.email}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1">

                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />

                            <span className="text-xs text-green-600">
                                Signed in
                            </span>

                        </div>

                    </div>

                </div>


                {/* Logout Button */}

                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2.5 rounded-lg transition-colors"
                >
                    <LogOut size={18} />
                    Logout
                </button>

            </div>

        </aside>

    );
}
