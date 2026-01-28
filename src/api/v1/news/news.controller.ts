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
import { NewsService } from 'src/services/news/news.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { NewsDto, NewsletterDto, UpdateNewsDto } from 'src/dtos/company/news.dto';
import { UserService } from 'src/services/user/user.service';

@Controller('news')
export class NewsController {
  constructor(
    private newsService: NewsService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async addNews(
    @Body() requestDto: NewsDto,
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

    const result = await this.newsService.addNews(user, requestDto);
    if (result.success) {
      return result;
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @Post('/subscribe')
  async addNewsSubscribe(
    @Body() requestDto: NewsletterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatePublicRequestByToken(authToken);
    if (!authResponse.success) return authResponse;

    const result = await this.newsService.AddNewsletterSubscription(requestDto);
    if (result.success) {
      return result;
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @UseGuards(AppGuard)
  @Put('/:newsId')
  async updateNews(
    @Body() requestDto: UpdateNewsDto,
    @Headers('Authorization') token: string,
    @Param('newsId') newsId: number,
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

    const result = await this.newsService.updateNews(newsId, user, requestDto);
    if (result.success) {
      return result;
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @UseGuards(AppGuard)
  @Delete('/:newsId')
  async deleteNews(
    @Headers('Authorization') token: string,
    @Param('newsId') newsId: number,
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

    const result = await this.newsService.deleteNews(newsId, user);
    if (result.success) {
      return result;
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @Get('/details/:newsId')
  async getNewsById(
    @Headers('Authorization') token: string,
    @Param('newsId') newsId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success) {
      const userResponse =
        await this.userService.authenticatePublicRequestByToken(authToken);
      if (!userResponse.success)
        return Response.send(
          HttpStatus.UNAUTHORIZED,
          userResponse.message,
          userResponse.payload,
        );
    }

    const result = await this.newsService.findNewsById(newsId);
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  @Get('/list')
  async getAllNews(
    @Query('page') page: number,
    @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.newsService.findAllNewss(user, page, size);
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    } else {
      const authResponse =
        await this.userService.authenticatePublicRequestByToken(authToken);
      if (!authResponse.success) return authResponse;

      const result = await this.newsService.findAllPublicNewss(page, size);
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }

  @Get('/search')
  async searchNewss(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchText: string,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.newsService.findAllNewss(user, page, size);
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    } else {
      const authResponse =
        await this.userService.authenticatePublicRequestByToken(authToken);
      if (!authResponse.success) return authResponse;

      const result = await this.newsService.searchPublicNewss(
        page,
        size,
        searchText,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }
}
