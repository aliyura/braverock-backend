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
import { MaterialRequestDto, UpdateMaterialRequestDto } from 'src/dtos/material.dto';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { MaterialRequestService } from 'src/services/material/material-request.service';

@Controller('material-request')
export class MaterialRequestController {
  constructor(
    private materialRequestService: MaterialRequestService,
    private userService: UserService,
  ) { }

  @UseGuards(AppGuard)
  @Post('/')
  async addMaterialRequest(
    @Body() requestDto: MaterialRequestDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.materialRequestService.addMaterialRequest(user, requestDto);
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }



  @UseGuards(AppGuard)
  @Put('/:materialRequestId')
  async updateMaterialRequest(
    @Body() requestDto: UpdateMaterialRequestDto,
    @Headers('Authorization') token: string,
    @Param('materialRequestId') materialRequestId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.materialRequestService.updateMaterialRequest(
      materialRequestId,
      user,
      requestDto,
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Put('/status/:materialRequestId')
  async updateMaterialRequestStatus(
    @Headers('Authorization') token: string,
    @Param('materialRequestId') materialRequestId: number,
    @Query('status') status: string
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.materialRequestService.updateMaterialRequestStatus(
      materialRequestId,
      user,
      status,
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Delete('/:materialRequestId')
  async deleteMaterialRequest(
    @Headers('Authorization') token: string,
    @Param('materialRequestId') materialRequestId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.materialRequestService.deleteMaterialRequest(
      materialRequestId,
      user
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }



  @UseGuards(AppGuard)
  @Get('/detail')
  async getMaterial(
    @Query('id') id: number,
  ): Promise<ApiResponse> {
    const response = await this.materialRequestService.findMaterialRequestById(id);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.NOT_FOUND, response.message);
  }


  @UseGuards(AppGuard)
  @Get('/list')
  async getAllMaterialRequests(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.materialRequestService.findAllMaterialRequests(
      user,
      page,
      size,
      filter
    );
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/search')
  async searchMaterialRequests(
    @Query('page') page: number,
    @Query('size') size: number,
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
    const result = await this.materialRequestService.searchMaterialRequests(
      user,
      page,
      size,
      searchText
    );
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }
}
