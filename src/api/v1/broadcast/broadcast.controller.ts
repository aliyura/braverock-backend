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
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { BroadcastService } from 'src/services/broadcast/broadcast.service';
import {
  NewBroadcastDto,
  UpdateBroadcastDto,
} from 'src/dtos/broadcast/broadcast.dto';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';

@Controller('broadcast')
export class BroadcastController {
  constructor(
    private readonly broadcastService: BroadcastService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async createBroadcast(
    @Body() requestDto: NewBroadcastDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.broadcastService.createBroadcast(
      user,
      requestDto,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Post('/release/:broadcastId')
  async releaseBroadcast(
    @Param('broadcastId') broadcastId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.broadcastService.releaseBroadcast(
      broadcastId,
      user,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Put('/:broadcastId')
  async updateBroadcast(
    @Body() requestDto: UpdateBroadcastDto,
    @Param('broadcastId') broadcastId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.broadcastService.updateBroadcast(
      broadcastId,
      user,
      requestDto,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Delete('/:broadcastId')
  async deleteBroadcast(
    @Param('broadcastId') broadcastId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.broadcastService.deleteBroadcast(
      broadcastId,
      user,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/details/:broadcastId')
  async getBroadcastById(
    @Param('broadcastId') broadcastId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const result = await this.broadcastService.getBroadcastById(broadcastId);
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getBroadcasts(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.broadcastService.getBroadcasts(
      user,
      page,
      size,
      filter,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/search')
  async searchBroadcasts(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchText: string,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const user = userResponse.payload;
    const result = await this.broadcastService.searchBroadcast(
      user,
      page,
      size,
      searchText,
      filter,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }
}
