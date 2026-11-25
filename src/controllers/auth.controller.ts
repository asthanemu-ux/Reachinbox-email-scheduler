import { Request, Response } from "express";
import "express-session";
import { AuthUser } from "../config/passport";


// Get logged-in user profile

export function getCurrentUser(req: Request, res: Response) {

    if (!req.isAuthenticated()) {
        res.status(401).json({
            success: false,
            message: "Not authenticated"
        });
        return;
    }

    const user = req.user as AuthUser;

    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
        }
    });
}


// Logout user

export function logoutUser(req: Request, res: Response) {

    req.logout((error) => {

        if (error) {
            res.status(500).json({
                success: false,
                message: "Logout failed"
            });
            return;
        }

        req.session.destroy((sessionError) => {

            if (sessionError) {
                res.status(500).json({
                    success: false,
                    message: "Failed to destroy session"
                });
                return;
            }

            res.clearCookie("reachinbox.sid", {
                path: "/"
            });

            res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        });
    });
}