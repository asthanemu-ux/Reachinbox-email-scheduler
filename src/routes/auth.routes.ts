import { Router } from "express";
import passport from "../config/passport";

import {
    getCurrentUser,
    logoutUser
} from "../controllers/auth.controller";

import { requireAuth } from "../middleware/auth.middleware";

const router = Router();


// Start Google OAuth login

router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);


// Google OAuth callback

router.get(
    "/google/callback",

    passport.authenticate("google", {
        failureRedirect:
            `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=google`
    }),

    (req, res) => {
        res.redirect(
            process.env.FRONTEND_URL || "http://localhost:5173"
        );
    }
);


// Get authenticated user

router.get("/me", requireAuth, getCurrentUser);


// Logout

router.post("/logout", requireAuth, logoutUser);


export default router;