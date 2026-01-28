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
import { ReservationService } from 'src/services/reservation/reservation.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import {
  ReservationDto,
  ReservationValidationDto,
} from 'src/dtos/sale/reservation.dto';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { UpdateStatusDto } from 'src/dtos/master';

@Controller('reservation')
export class ReservationController {
  constructor(
    private reservationService: ReservationService,
    private userService: UserService,
  ) {}

  @Post('/')
  async addReservation(
    @Body() requestDto: ReservationDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.reservationService.addReservation(
        requestDto,
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
    } else {
      const userResponse =
        await this.userService.authenticatePublicRequestByToken(authToken);
      if (!userResponse.success)
        return Response.send(
          HttpStatus.UNAUTHORIZED,
          userResponse.message,
          userResponse.payload,
        );

      const result = await this.reservationService.addReservation(requestDto);
      if (result.success) {
        return result;
      }
      return Response.send(
        HttpStatus.BAD_REQUEST,
        result.message,
        result.payload,
      );
    }
  }

  @UseGuards(AppGuard)
  @Delete('/:reservationId')
  async cancelReservation(
    @Headers('Authorization') token: string,
    @Param('reservationId') reservationId: number,
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

    const result = await this.reservationService.cancelReservation(
      reservationId,
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

  @UseGuards(AppGuard)
  @Patch('/:reservationId')
  async updateStatus(
    @Body() requestDto: UpdateStatusDto,
    @Headers('Authorization') token: string,
    @Param('reservationId') reservationId: number,
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
    const result = await this.reservationService.changeReservationStatus(
      user,
      reservationId,
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
  @Post('/validation/:propertyId')
  async validateReservationCode(
    @Body() requestDto: ReservationValidationDto,
    @Headers('Authorization') token: string,
    @Param('propertyId') propertyId: number,
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
    const result = await this.reservationService.validateReservation(
      user,
      propertyId,
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
  @Get('/list')
  async getAllReservations(
    @Query('page') page: number,
    @Query('size') size: number,
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
    const result = await this.reservationService.findAllReservations(
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
  async searchReservations(
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
    const result = await this.reservationService.searchReservations(
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
