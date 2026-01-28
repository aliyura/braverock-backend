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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DiscountOfferService } from 'src/services/discount-offer/discount-offer.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import {
  DiscountOfferDto,
  UpdateDiscountOfferDto,
} from 'src/dtos/property/discount-offer.dto';
import { UserService } from 'src/services/user/user.service';
import { UpdateStatusDto } from 'src/dtos/master';
import { FilterDto } from 'src/dtos/filter.dto';

@Controller('discount-offer')
export class DiscountOfferController {
  constructor(
    private discountOfferService: DiscountOfferService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async addDiscountOffer(
    @Body() requestDto: DiscountOfferDto,
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

    const result = await this.discountOfferService.addDiscountOffer(
      user,
      requestDto,
    );
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
  @Put('/:discountOfferId')
  async updateDiscountOffer(
    @Body() requestDto: UpdateDiscountOfferDto,
    @Headers('Authorization') token: string,
    @Param('discountOfferId') discountOfferId: number,
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

    const result = await this.discountOfferService.updateDiscountOffer(
      discountOfferId,
      user,
      requestDto,
    );
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
  @Patch('/:discountOfferId')
  async updateInspectionRequestStatus(
    @Body() requestDto: UpdateStatusDto,
    @Headers('Authorization') token: string,
    @Param('discountOfferId') discountOfferId: number,
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
    const result = await this.discountOfferService.changeDiscountOfferStatus(
      user,
      discountOfferId,
      requestDto,
    );
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
  @Delete('/:discountOfferId')
  async deleteDiscountOffer(
    @Headers('Authorization') token: string,
    @Param('discountOfferId') discountOfferId: number,
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

    const result = await this.discountOfferService.deleteDiscountOffer(
      discountOfferId,
      user,
    );
    if (result.success) {
      return result;
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @Get('/detail')
  async getDiscountOfferById(
    @Headers('Authorization') token: string,
    @Query('id') discountOfferId: number,
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

    const result =
      await this.discountOfferService.getDiscountOfferById(discountOfferId);
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  @Get('/list')
  async getAllDiscountOffers(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.discountOfferService.findAllDiscountOffers(
        user,
        page,
        size,
        filter,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    } else {
      const authResponse =
        await this.userService.authenticatePublicRequestByToken(authToken);
      if (!authResponse.success) return authResponse;

      const result =
        await this.discountOfferService.findAllPublicDiscountOffers(
          page,
          size,
          filter,
        );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }

  @Get('/search')
  async searchDiscountOffers(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchText: string,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.discountOfferService.searchDiscountOffers(
        user,
        page,
        size,
        searchText,
        filter,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    } else {
      const authResponse =
        await this.userService.authenticatePublicRequestByToken(authToken);
      if (!authResponse.success) return authResponse;

      const result = await this.discountOfferService.searchPublicDiscountOffers(
        page,
        size,
        searchText,
        filter,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }
}
