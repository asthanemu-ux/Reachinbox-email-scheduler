
import { Mail, Clock, ShieldCheck } from "lucide-react";

export default function Login() {

    const handleGoogleLogin = () => {
        window.location.href =
            "http://localhost:5000/api/auth/google";
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">

            <div className="w-full max-w-md">

                <div className="flex items-center justify-center gap-2 mb-8">

                    <div className="bg-green-600 text-white p-2 rounded-xl">
                        <Mail size={26} />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900">
                        ReachInbox
                    </h1>

                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

                    <h2 className="text-2xl font-bold text-center text-slate-900">
                        Welcome to ReachInbox
                    </h2>

                    <p className="text-slate-500 text-center mt-3 mb-8">
                        Schedule, manage and track your email campaigns
                        from one powerful dashboard.
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-lg py-3 font-medium hover:bg-slate-50 cursor-pointer transition"
                    >

                        <span className="text-blue-600 text-xl font-bold">
                            G
                        </span>

                        Continue with Google

                    </button>

                    <div className="border-t border-slate-100 mt-8 pt-6 space-y-4">

                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Clock size={19} className="text-green-600" />
                            Smart email scheduling
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Mail size={19} className="text-green-600" />
                            Multiple SMTP senders
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <ShieldCheck size={19} className="text-green-600" />
                            Secure Google authentication
                        </div>

                    </div>

                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    ReachInbox Email Scheduler
                </p>

            </div>

        </div>
    );
}
