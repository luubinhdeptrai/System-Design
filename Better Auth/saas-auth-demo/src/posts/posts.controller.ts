import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * GET /posts
   * Public — anyone can list posts.
   */
  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  /**
   * GET /posts/:id
   * Public.
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    const post = await this.postsService.findById(id);
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return post;
  }

  /**
   * POST /posts
   * Protected — only authenticated users can create posts.
   * The author is taken from the session, not from the request body.
   */
  @Post()
  @UseGuards(SessionGuard)
  create(@Req() req: Request, @Body() dto: CreatePostDto) {
    return this.postsService.create({
      title: dto.title,
      content: dto.content,
      authorId: req.currentUser!.id,
    });
  }

  /**
   * DELETE /posts/:id
   * Protected — only the post's author can delete it.
   */
  @Delete(":id")
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param("id") id: string): Promise<void> {
    const post = await this.postsService.findById(id);
    if (!post) throw new NotFoundException(`Post ${id} not found`);

    // Authorization check: the requester must own the post.
    // This is a simple ownership check; for role-based access use
    // Better Auth's organization plugin with custom permissions.
    if (post.authorId !== req.currentUser!.id) {
      throw new ForbiddenException("You can only delete your own posts");
    }

    await this.postsService.delete(id);
  }
}
