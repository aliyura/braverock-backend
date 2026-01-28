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
import { FaqService } from 'src/services/faq/faq.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { FaqDto, UpdateFaqDto } from 'src/dtos/company/faq.dto';
import { UserService } from 'src/services/user/user.service';
import { Messages } from 'src/utils/messages/messages';

@Controller('faq')
export class FaqController {
  constructor(
    private faqService: FaqService,
    private userService: UserService,
  ) { }

  @UseGuards(AppGuard)
  @Post('/')
  async addFaq(
    @Body() requestDto: FaqDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.faqService.addFaq(user, requestDto);
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Put('/:faqId')
  async updateFaq(
    @Body() requestDto: UpdateFaqDto,
    @Headers('Authorization') token: string,
    @Param('faqId') faqId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.faqService.updateFaq(
      faqId,
      user,
      requestDto,
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Delete('/:faqId')
  async deleteFaq(
    @Headers('Authorization') token: string,
    @Param('faqId') faqId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.faqService.deleteFaq(
      faqId,
      user
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @Get('/list')
  async getAllFaqs(
    @Query('page') page: number, @Query('size') size: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.faqService.findAllFaqs(
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

      const result = await this.faqService.findAllPublicFaqs(
        page,
        size,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }

  @Get('/search')
  async searchFaqs(
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
      const result = await this.faqService.searchFaqs(
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

      const result = await this.faqService.searchPublicFaqs(
        page, size,
        searchText,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }
}
