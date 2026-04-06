import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * Returns the authenticated user's profile + current session metadata.
   *
   * `req.currentUser` and `req.currentSession` are attached by SessionGuard.
   * We re-fetch from DB to ensure we return the latest data (not a stale
   * snapshot that may be cached in the session cookie).
   */
  @Get("me")
  @UseGuards(SessionGuard)
  async getProfile(@Req() req: Request) {
    // Re-read from DB for consistency (e.g., after a profile update)
    const latestUser = await this.usersService.findById(req.currentUser!.id);

    return {
      user: {
        id: latestUser!.id,
        name: latestUser!.name,
        email: latestUser!.email,
        emailVerified: latestUser!.emailVerified,
        image: latestUser!.image,
        createdAt: latestUser!.createdAt,
      },
      session: {
        id: req.currentSession!.id,
        expiresAt: req.currentSession!.expiresAt,
        ipAddress: req.currentSession!.ipAddress,
        userAgent: req.currentSession!.userAgent,
      },
    };
  }

  /**
   * GET /users/me/sessions
   * Lists all active sessions for the current user.
   * Enables a "manage devices / sign out other devices" feature.
   */
  @Get("me/sessions")
  @UseGuards(SessionGuard)
  async getSessions(@Req() req: Request) {
    return this.usersService.getActiveSessions(req.currentUser!.id);
  }

  /**
   * DELETE /users/me
   * Permanently deletes the authenticated user's account.
   * Cascade ensures all sessions and account rows are removed too.
   * Returns 204 No Content on success.
   */
  @Delete("me")
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Req() req: Request): Promise<void> {
    await this.usersService.deleteUser(req.currentUser!.id);
    // Note: the session cookie remains set on the client after this.
    // The client should call POST /api/auth/sign-out to clear the cookie,
    // or you can call auth.api.revokeUserSessions({ userId }) here before deletion.
  }
}
