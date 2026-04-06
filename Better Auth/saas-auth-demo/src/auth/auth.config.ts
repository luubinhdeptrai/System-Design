import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";

// ---------------------------------------------------------------------------
// Validate required environment variables at startup.
// Fail fast rather than silently misconfiguring the auth module.
// ---------------------------------------------------------------------------
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required (min 32 chars)");
}
if (!process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL environment variable is required");
}

/**
 * Better Auth server instance.
 *
 * This object is framework-agnostic and is used in two ways inside NestJS:
 *   1. `toNodeHandler(auth)` — converts to an Express-compatible handler,
 *      mounted at ALL /api/auth/* routes in AuthController.
 *   2. `auth.api.*` — programmatic calls from SessionGuard and services
 *      (e.g., auth.api.getSession(), auth.api.revokeSession()).
 *
 * Do NOT create multiple instances of betterAuth() — it opens one DB pool.
 */
export const auth = betterAuth({
  // ── Database ───────────────────────────────────────────────────────────────
  // Drizzle adapter connects Better Auth to our PostgreSQL schema.
  // The `schema` mapping tells BA which Drizzle table corresponds to each
  // of its internal models (user, account, session, verification).
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
    },
  }),

  // ── Base URL ───────────────────────────────────────────────────────────────
  // Used when Better Auth generates absolute URLs:
  //   - OAuth redirect/callback URLs
  //   - Magic link click URLs in emails
  // Must match your actual public server URL.
  baseURL: process.env.BETTER_AUTH_URL,

  // ── Signing Secret ────────────────────────────────────────────────────────
  // Used to sign session cookies and encrypt sensitive fields.
  // Minimum 32 characters. Rotating this value invalidates all active sessions.
  secret: process.env.BETTER_AUTH_SECRET,

  // ── Email + Password Auth ─────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    // autoSignIn: true creates a session immediately after registration.
    // Set to false if you want to require email verification first.
    autoSignIn: true,
  },

  // ── Session Configuration ─────────────────────────────────────────────────
  session: {
    // Total session lifetime: 7 days from last activity.
    expiresIn: 60 * 60 * 24 * 7,

    // Rolling expiry: if a request comes in and the session is older than
    // updateAge seconds, reset expiresAt to now + expiresIn.
    // Here: reset the 7-day clock once per day of active use.
    updateAge: 60 * 60 * 24,

    // Cookie cache: stores a signed, short-lived copy of the validated
    // session in a second cookie.
    //
    // Trade-off:
    //   - Reduces PostgreSQL reads (no DB hit for 5 minutes after validation)
    //   - Sessions are still DB-backed and can be revoked
    //   - A revoked session remains usable until maxAge expires (5 min window)
    //
    // For instant revocation (admin ban, fraud): set enabled: false.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // ── Plugins ────────────────────────────────────────────────────────────────
  plugins: [
    // Magic link: passwordless login via a one-time URL sent to the user's email.
    // Exposes:
    //   POST /api/auth/magic-link/send   → creates verification record + sends email
    //   GET  /api/auth/magic-link/verify → validates token → creates session
    magicLink({
      // sendMagicLink is called by Better Auth with the generated URL.
      // Replace this stub with your real email provider (Resend, SES, Nodemailer…).
      sendMagicLink: async ({ email, token, url }) => {
        console.log(`[MAGIC LINK] To: ${email}`);
        console.log(`[MAGIC LINK] URL: ${url}`);
        // Example with Resend:
        // await resend.emails.send({
        //   from: 'no-reply@yourdomain.com',
        //   to: email,
        //   subject: 'Your sign-in link',
        //   html: `<a href="${url}">Click to sign in</a>`,
        // });
      },
    }),
  ],

  // ── CSRF / Trusted Origins ─────────────────────────────────────────────────
  // Better Auth validates the Origin header on mutations.
  // List every frontend domain that sends authenticated requests.
  // Requests from unlisted origins will be rejected with 403.
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim()),
});

// Re-export inferred types so NestJS code is type-safe when reading session data.
export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
