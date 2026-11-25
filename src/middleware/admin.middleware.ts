import { Request, Response, NextFunction } from "express";
import { AuthUser } from "../config/passport";

export function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
) {

    if (!req.isAuthenticated()) {
        res.status(401).json({
            success: false,
            message: "Authentication required"
        });
        return;
    }

    const user = req.user as AuthUser;

    const adminEmail = process.env.ADMIN_EMAIL;

    if (
        !adminEmail ||
        user.email.toLowerCase() !== adminEmail.toLowerCase()
    ) {
        res.status(403).json({
            success: false,
            message: "Admin access required"
        });
        return;
    }

    next();
}