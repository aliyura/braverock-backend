import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from 'src/services/chat/chat.service';
import { UserService } from 'src/services/user/user.service';
import { AppGuard } from 'src/services/auth/app.guard';
import { Response } from 'src/helpers';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import {
  CreateThreadDto,
  CreateGroupDto,
  UpdateGroupDto,
  GroupMemberActionDto,
  SendMessageDto,
  ForwardMessageDto,
} from 'src/dtos/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private userService: UserService,
  ) {}

  /**
   * 🧩 Get all threads (private + group)
   */
  @UseGuards(AppGuard)
  @Get('/threads')
  async getThreads(
    @Query('page') page: number,
    @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const user = userResponse.payload;
    const result = await this.chatService.getUserThreads(user.id, page, size);
    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  /**
   * 💬 Get all messages for a thread
   */
  @UseGuards(AppGuard)
  @Get('/messages/:threadId')
  async getThreadMessages(
    @Param('threadId') threadId: number,
    @Query('page') page: number,
    @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const user = userResponse.payload;
    const result = await this.chatService.getThreadMessages(
      user.id,
      threadId,
      page,
      size,
    );
    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Post('/forward')
  async forwardMessage(
    @Body() requestDto: ForwardMessageDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.chatService.forwardMessage(requestDto);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * ✅ Mark thread as read
   */
  @UseGuards(AppGuard)
  @Patch('/mark-read/:threadId')
  async markThreadAsRead(
    @Param('threadId') threadId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const user = userResponse.payload;
    const result = await this.chatService.markAsRead(threadId, user.id);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * 🔍 Search chat threads
   */
  @UseGuards(AppGuard)
  @Get('/search')
  async searchThreads(
    @Query('q') q: string,
    @Query('page') page: number,
    @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const user = userResponse.payload;
    const result = await this.chatService.getUserThreads(user.id, page, size);
    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  /**
   * 🧩 Create or get private 1-to-1 thread
   */
  @UseGuards(AppGuard)
  @Post('/create-thread')
  async createThread(
    @Body() requestDto: CreateThreadDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.chatService.createThread(requestDto);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * 👥 Create a new group chat
   */
  @UseGuards(AppGuard)
  @Post('/group/create')
  async createGroup(
    @Body() requestDto: CreateGroupDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const user = userResponse.payload;
    const result = await this.chatService.createGroup(user.id, requestDto);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * ✏️ Update group info
   */
  @UseGuards(AppGuard)
  @Patch('/group/:groupId')
  async updateGroup(
    @Param('groupId') groupId: number,
    @Body() requestDto: UpdateGroupDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.chatService.updateGroup(groupId, requestDto);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * ➕ Add members to group
   */
  @UseGuards(AppGuard)
  @Post('/group/:groupId/add-members')
  async addGroupMembers(
    @Param('groupId') groupId: number,
    @Body() requestDto: GroupMemberActionDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.chatService.addMembers(groupId, requestDto);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * ➖ Remove member from group
   */
  @UseGuards(AppGuard)
  @Delete('/group/:groupId/remove/:memberId')
  async removeGroupMember(
    @Param('groupId') groupId: number,
    @Param('memberId') memberId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.chatService.removeMember(groupId, memberId);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * 🚪 Leave a group
   */
  @UseGuards(AppGuard)
  @Patch('/group/:groupId/leave')
  async leaveGroup(
    @Param('groupId') groupId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const user = userResponse.payload;
    const result = await this.chatService.leaveGroup(groupId, user.id);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * 📌 Pin or unpin a thread
   */
  @UseGuards(AppGuard)
  @Patch('/pin/:threadId')
  async togglePinThread(
    @Param('threadId') threadId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.chatService.togglePin(threadId);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /**
   * 🗑️ Delete a thread
   */
  @UseGuards(AppGuard)
  @Delete('/delete/:threadId')
  async deleteThread(
    @Param('threadId') threadId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.chatService.deleteThread(threadId);
    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }
}
