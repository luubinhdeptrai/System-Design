import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthUser, AuthSession } from "./auth.config";

// Extend Express Request so TypeScript knows about our attached properties.
declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthUser;
      currentSession?: AuthSession["session"];
    }
  }
}

/**
 * SessionGuard — protects any route that requires an authenticated user.
 *
 * Usage:
 *   @UseGuards(SessionGuard)
 *   @Get('me')
 *   getProfile(@Req() req: Request) { return req.currentUser; }
 *
 * What it does:
 *   1. Reads the session cookie from the incoming request headers
 *   2. Calls auth.api.getSession() which either:
 *        a. reads from the in-memory cookie cache (fast, no DB hit)
 *        b. queries the session table in PostgreSQL (on cache miss)
 *   3. If valid: attaches `currentUser` and `currentSession` to req, proceeds
 *   4. If invalid / expired / missing: throws 401 Unauthorized
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & {
      headers: Record<string, string | string[]>;
      currentUser?: AuthUser;
      currentSession?: AuthSession["session"];
    }>();

    // Convert Express's plain header object to the Web API Headers interface
    // that Better Auth expects internally.
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      }
    }

    const result = await this.authService.getSession(headers);

    if (!result) {
      throw new UnauthorizedException(
        "Authentication required. Please sign in."
      );
    }

    // Attach to the request so route handlers can read user/session data
    // without an extra database call or service injection.
    req.currentUser = result.user;
    req.currentSession = result.session;

    return true;
  }
}
