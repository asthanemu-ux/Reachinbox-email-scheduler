
import emailWorker from "./workers/emailWorker";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "./config/passport";

import pool from "./db/database";
import redis from "./config/redis";

import emailRoutes from "./routes/email.routes";
import authRoutes from "./routes/auth.routes";

import serverAdapter from "./config/bullBoard";
import { recoverEmails } from "./services/recovery.service";

import { requireAdmin } from "./middleware/admin.middleware";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 5000);

const FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:5173";

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not configured");
}


// Basic middleware

app.use(helmet());

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

app.use(express.json());


// PostgreSQL session store

const PgSession = connectPgSimple(session);

app.use(
    session({
        store: new PgSession({
            pool: pool,
            tableName: "user_sessions",
            createTableIfMissing: true
        }),

        name: "reachinbox.sid",

        secret: SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);


// Initialize Passport

app.use(passport.initialize());

app.use(passport.session());


// Health check

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "ReachInbox Backend is running!"
    });
});


// Authentication routes

app.use("/api/auth", authRoutes);


// Email routes

app.use("/api/emails", emailRoutes);


// Protected Bull Board

app.use(
    "/admin/queues",
    requireAdmin,
    serverAdapter.getRouter()
);


// Start backend server

async function startServer() {

    try {

        await pool.query("SELECT NOW()");

        console.log("Connected to PostgreSQL database");

        const response = await redis.ping();

        console.log("Redis response:", response);

        await emailWorker.waitUntilReady();

        await recoverEmails();

        app.listen(PORT, "127.0.0.1", () => {

            console.log(`Server running on port ${PORT}`);

            console.log(
                `Bull Board: http://localhost:${PORT}/admin/queues`
            );

            console.log(
                `Google Login: http://localhost:${PORT}/api/auth/google`
            );
        });

    } catch (error) {

        console.error("Backend startup failed:", error);

        process.exit(1);
    }
}

startServer();
