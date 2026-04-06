import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PostsModule } from "./posts/posts.module";

@Module({
  imports: [
    // Load .env into process.env.* before any other module initializes.
    // isGlobal: true means you don't need to import ConfigModule per feature module.
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    PostsModule,
  ],
})
export class AppModule {}
