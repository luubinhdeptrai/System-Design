import { Injectable } from "@nestjs/common";
import { toNodeHandler } from "better-auth/node";
import { auth, AuthSession } from "./auth.config";

@Injectable()
export class AuthService {
  /**
   * Express-compatible request handler for all /api/auth/* routes.
   *
   * `toNodeHandler()` adapts Better Auth's Web API handler (which uses the
   * Fetch API's Request/Response objects) to Node's IncomingMessage /
   * ServerResponse interface used by Express underneath NestJS.
   *
   * The AuthController passes every /api/auth/* request directly to this.
   * Better Auth owns internal routing from that point on.
   */
  readonly handler = toNodeHandler(auth);

  /**
   * Validates the session cookie in the given headers.
   *
   * Returns `{ user, session }` if a valid session exists, or `null`.
   *
   * Called by SessionGuard on every protected request.
   * Also used directly by services that need to inspect the current user
   * without going through a guard (e.g., audit logging).
   */
  async getSession(headers: Headers): Promise<AuthSession | null> {
    return auth.api.getSession({ headers });
  }
}
