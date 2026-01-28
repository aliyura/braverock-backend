import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessageService } from 'src/services/message/message.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { MessageDto, ReplyMessageDto } from 'src/dtos/company/message.dto';
import { UserService } from 'src/services/user/user.service';
import { Messages } from 'src/utils/messages/messages';
import { UpdateStatusDto } from 'src/dtos/master';

@Controller('message')
export class MessageController {
  constructor(
    private messageService: MessageService,
    private userService: UserService,
  ) { }

  @Post('/')
  async addMessage(
    @Body() requestDto: MessageDto,
    @Headers('Authorization') token: string
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse = await this.userService.authenticatePublicRequestByToken(authToken);
    if (!authResponse.success)
      return authResponse;

    const result = await this.messageService.addMessage(
      requestDto,
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Post('/reply/:requestId')
  async replyMessage(
    @Body() requestBody: ReplyMessageDto,
    @Param('requestId') requestId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.messageService.replyMessage(
      user,
      requestId,
      requestBody
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Patch('/:requestId')
  async updateMessageStatus(
    @Body() requestDto: UpdateStatusDto,
    @Param('requestId') requestId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.messageService.updateMessageStatus(
      user,
      requestId,
      requestDto,
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllMessages(
    @Query('page') page: number, @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const users = await this.messageService.findAllMessages(user, page, size);
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }

  @UseGuards(AppGuard)
  @Get('/search')
  async searchMessages(
    @Query('page') page: number, @Query('size') size: number,
    @Query('q') searchText: string,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const users = await this.messageService.searchMessages(
      user,
      page, size,
      searchText,
    );
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }
}
