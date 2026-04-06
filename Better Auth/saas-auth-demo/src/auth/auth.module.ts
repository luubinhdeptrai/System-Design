import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionGuard } from "./session.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  // Export both so any feature module can inject them
  // without re-importing AuthModule (just import AuthModule in that module).
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
