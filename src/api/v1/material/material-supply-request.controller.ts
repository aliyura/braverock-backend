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
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import {
  MaterialSupplyRequestDto,
  UpdateMaterialSupplyRequestDto,
} from 'src/dtos/material.dto';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { MaterialSupplyRequestService } from 'src/services/material/material-supply-request.service';

@Controller('supply-request')
export class MaterialSupplyRequestController {
  constructor(
    private materialRequestService: MaterialSupplyRequestService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async addMaterialSupplyRequest(
    @Body() requestDto: MaterialSupplyRequestDto,
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
    const result = await this.materialRequestService.addMaterialSupplyRequest(
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
  @Put('/:materialRequestId')
  async updateMaterialSupplyRequest(
    @Body() requestDto: UpdateMaterialSupplyRequestDto,
    @Headers('Authorization') token: string,
    @Param('materialRequestId') materialRequestId: number,
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
      await this.materialRequestService.updateMaterialSupplyRequest(
        materialRequestId,
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
  @Put('/status/:materialRequestId')
  async updateMaterialSupplyRequestStatus(
    @Headers('Authorization') token: string,
    @Param('materialRequestId') materialRequestId: number,
    @Query('status') status: string,
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
      await this.materialRequestService.updateMaterialSupplyRequestStatus(
        materialRequestId,
        user,
        status,
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
  @Delete('/:materialRequestId')
  async deleteMaterialSupplyRequest(
    @Headers('Authorization') token: string,
    @Param('materialRequestId') materialRequestId: number,
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
      await this.materialRequestService.deleteMaterialSupplyRequest(
        materialRequestId,
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
  @Get('/detail')
  async getMaterial(@Query('id') id: number): Promise<ApiResponse> {
    const response =
      await this.materialRequestService.findMaterialSupplyRequestById(id);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.NOT_FOUND, response.message);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllMaterialSupplyRequests(
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
      await this.materialRequestService.findAllMaterialSupplyRequests(
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
  async searchMaterialSupplyRequests(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchText: string,
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
      await this.materialRequestService.searchMaterialSupplyRequests(
        user,
        page,
        size,
        searchText,
      );
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }
}
