import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import pool from "../db/database";

dotenv.config();

export interface AuthUser {
    id: string;
    google_id: string;
    name: string;
    email: string;
    avatar: string | null;
}

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: process.env.GOOGLE_CALLBACK_URL!,
            state: true
        },

        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleId = profile.id;
                const name = profile.displayName;
                const email = profile.emails?.[0]?.value;
                const avatar = profile.photos?.[0]?.value || null;

                if (!email) {
                    return done(new Error("Google email not found"));
                }

                const result = await pool.query(
                    `INSERT INTO users
                     (id, google_id, name, email, avatar,
                      created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())

                     ON CONFLICT (google_id)
                     DO UPDATE SET
                         name = EXCLUDED.name,
                         email = EXCLUDED.email,
                         avatar = EXCLUDED.avatar,
                         updated_at = NOW()

                     RETURNING id, google_id, name, email, avatar`,
                    [
                        randomUUID(),
                        googleId,
                        name,
                        email,
                        avatar
                    ]
                );

                const user: AuthUser = result.rows[0];

                return done(null, user);

            } catch (error) {
                return done(error as Error);
            }
        }
    )
);


// Store user ID in the session

passport.serializeUser((user, done) => {
    const authUser = user as AuthUser;

    done(null, authUser.id);
});


// Retrieve user from PostgreSQL using session ID

passport.deserializeUser(async (id: string, done) => {
    try {
        const result = await pool.query(
            `SELECT id, google_id, name, email, avatar
             FROM users
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return done(null, false);
        }

        return done(null, result.rows[0]);

    } catch (error) {
        return done(error as Error);
    }
});

export default passport;