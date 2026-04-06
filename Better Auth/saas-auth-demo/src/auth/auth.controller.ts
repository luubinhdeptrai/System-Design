                             import { All, Controller, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";

/**
 * Auth catch-all controller.
 *
 * Every request under /api/auth/* is passed directly to Better Auth.
 * Better Auth handles its own internal routing — NestJS does not intercept,
 * transform, or validate these requests in any way.
 *
 * Routes that Better Auth exposes out of the box:
 *   POST /api/auth/sign-up/email          Register with email + password
 *   POST /api/auth/sign-in/email          Login with email + password
 *   POST /api/auth/sign-out               Logout (deletes session)
 *   GET  /api/auth/get-session            Returns current session (used by frontends)
 *   POST /api/auth/magic-link/send        Request a magic link
 *   GET  /api/auth/magic-link/verify      Verify magic link token (user clicks link)
 *   POST /api/auth/forget-password        Initiate password reset
 *   POST /api/auth/reset-password         Complete password reset
 */
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All("*")
  async handleAuth(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this.authService.handler(req, res);
  }
}
