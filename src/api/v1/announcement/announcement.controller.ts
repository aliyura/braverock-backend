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
import { AnnouncementService } from 'src/services/announcement/announcement.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { AnnouncementDto, UpdateAnnouncementDto } from 'src/dtos/company/announcement.dto';
import { UserService } from 'src/services/user/user.service';
import { Messages } from 'src/utils/messages/messages';

@Controller('announcement')
export class AnnouncementController {
  constructor(
    private announcementService: AnnouncementService,
    private userService: UserService,
  ) { }

  @UseGuards(AppGuard)
  @Post('/')
  async addAnnouncement(
    @Body() requestDto: AnnouncementDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.announcementService.addAnnouncement(user, requestDto);
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Put('/:announcementId')
  async updateAnnouncement(
    @Body() requestDto: UpdateAnnouncementDto,
    @Headers('Authorization') token: string,
    @Param('announcementId') announcementId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.announcementService.updateAnnouncement(
      announcementId,
      user,
      requestDto,
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Delete('/:announcementId')
  async deleteAnnouncement(
    @Headers('Authorization') token: string,
    @Param('announcementId') announcementId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.announcementService.deleteAnnouncement(
      announcementId,
      user
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @Get('/list')
  async getAllAnnouncements(
    @Query('page') page: number, @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.announcementService.findAllAnnouncements(
        user,
        page,
        size,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    } else {

      const authResponse = await this.userService.authenticatePublicRequestByToken(authToken);
      if (!authResponse.success)
        return authResponse;

      const result = await this.announcementService.findAllPublicAnnouncements(
        page,
        size,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }

  @Get('/search')
  async searchAnnouncements(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchText: string,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.announcementService.searchAnnouncements(
        user,
        page, size,
        searchText,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    } else {
  
      const authResponse = await this.userService.authenticatePublicRequestByToken(authToken);
      if (!authResponse.success)
        return authResponse;

      const result = await this.announcementService.searchPublicAnnouncements(
        page, size,
        searchText,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }
}
