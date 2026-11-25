
import { useEffect, useState } from "react";
import axios from "axios";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import api from "./services/api";
import type { User } from "./types";

function App() {

    const [user, setUser] = useState<User | null>(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    useEffect(() => {

        const checkAuth = async () => {

            try {

                const response = await api.get("/auth/me");

                setUser(response.data.data);

            } catch (error) {

                if (
                    axios.isAxiosError(error) &&
                    error.response?.status === 401
                ) {
                    setUser(null);
                } else {
                    setError("Unable to connect to the backend.");
                }

            } finally {

                setLoading(false);

            }
        };

        checkAuth();

    }, []);

    const handleLogout = async () => {

        try {

            await api.post("/auth/logout");

            setUser(null);

        } catch (error) {

            console.error("Logout failed:", error);

            alert("Logout failed. Please try again.");

        }
    };

    if (loading) {

        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">

                <div className="text-center">

                    <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />

                    <p className="text-slate-600">
                        Loading ReachInbox...
                    </p>

                </div>

            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-600">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-green-600 text-white px-5 py-2 rounded-lg"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!user) {

        return <Login />;

    }

    return (
        <Dashboard
            user={user}
            onLogout={handleLogout}
        />
    );
}

export default App;
