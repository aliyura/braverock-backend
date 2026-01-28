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
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { InspectionRequestService } from 'src/services/inspection-request/inspection-request.service';
import {
  InspectionRequestDto,
  UpdateInspectionRequestDto,
} from 'src/dtos/property/inspection-request.dto';
import { UpdateStatusDto } from 'src/dtos/master';

@Controller('inspection-request')
export class InspectionRequestController {
  constructor(
    private inspectionRequestService: InspectionRequestService,
    private userService: UserService,
  ) {}

  @Post('/')
  async addInspectionRequest(
    @Body() requestDto: InspectionRequestDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (userResponse.success) {
      const user = userResponse.payload;
      const result = await this.inspectionRequestService.addInspectionRequest(
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

      const result =
        await this.inspectionRequestService.addInspectionRequest(requestDto);
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
  @Put('/:inspectionRequestId')
  async updateInspectionRequest(
    @Body() requestDto: UpdateInspectionRequestDto,
    @Headers('Authorization') token: string,
    @Param('inspectionRequestId') inspectionRequestId: number,
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
    const result = await this.inspectionRequestService.updateInspectionRequest(
      inspectionRequestId,
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
  @Patch('/:inspectionRequestId')
  async updateInspectionRequestStatus(
    @Body() requestDto: UpdateStatusDto,
    @Headers('Authorization') token: string,
    @Param('inspectionRequestId') inspectionRequestId: number,
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
    const result =
      await this.inspectionRequestService.changeInspectionRequestStatus(
        user,
        inspectionRequestId,
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
  @Delete('/:inspectionRequestId')
  async deleteInspectionRequest(
    @Headers('Authorization') token: string,
    @Param('inspectionRequestId') inspectionRequestId: number,
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
    const result = await this.inspectionRequestService.deleteInspectionRequest(
      user,
      inspectionRequestId,
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
  @Get('/details/:inspectionRequestId')
  async getInspectionRequest(
    @Headers('Authorization') token: string,
    @Param('inspectionRequestId') inspectionRequestId: number,
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
    const result = await this.inspectionRequestService.getInspectionRequestById(
      user,
      inspectionRequestId,
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
  async getAllInspectionRequests(
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
    const result =
      await this.inspectionRequestService.findAllInspectionRequests(
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
  async searchInspectionRequests(
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
    const result = await this.inspectionRequestService.searchInspectionRequests(
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
