import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from 'src/services/notification/notification.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { UserService } from 'src/services/user/user.service';
import { StateStatus } from 'src/enums/enums';
import { GenericNotificationDto } from 'src/dtos/notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async postNotification(
    @Headers('Authorization') token: string,
    @Body() requestDto: GenericNotificationDto
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const users = await this.notificationService.postNotification(
      user,
      requestDto,
    );
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }

  @UseGuards(AppGuard)
  @Put('/:id')
  async updateNotificationStateStatus(
    @Query('status') status: StateStatus,
    @Param('id') notificationId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const users = await this.notificationService.updateNotificationStateStatus(
      user,
      notificationId,
      status,
    );
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }

  @UseGuards(AppGuard)
  @Delete('/')
  async deleteAllNotifications(
    @Query('page') page: number,  @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const users = await this.notificationService.deleteAllNotifications(user);
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllNotifications(
    @Query('page') page: number,  @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const users = await this.notificationService.findAllNotifications(
      user,
      page,size,
    );
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }
}
