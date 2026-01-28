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
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { MaterialTypeService } from 'src/services/material/materialType.service';
import { MaterialTypeDto, UpdateMaterialTypeDto } from 'src/dtos/material.dto';

@Controller('material-type')
export class MaterialTypeController {
  constructor(
    private materialTypeService: MaterialTypeService,
    private userService: UserService,
  ) { }

  @UseGuards(AppGuard)
  @Post('/')
  async addMaterialType(
    @Body() requestDto: MaterialTypeDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.materialTypeService.addMaterialType(user, requestDto);
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }



  @UseGuards(AppGuard)
  @Put('/:materialTypeId')
  async updateMaterialType(
    @Body() requestDto: UpdateMaterialTypeDto,
    @Headers('Authorization') token: string,
    @Param('materialTypeId') materialTypeId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.materialTypeService.updateMaterialType(
      materialTypeId,
      user,
      requestDto,
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Delete('/:materialTypeId')
  async deleteMaterialType(
    @Headers('Authorization') token: string,
    @Param('materialTypeId') materialTypeId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.materialTypeService.deleteMaterialType(
      materialTypeId,
      user
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Get('/detail')
  async getMaterialType(
    @Query('id') id: number,
  ): Promise<ApiResponse> {
    const response = await this.materialTypeService.findMaterialTypeById(id);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.NOT_FOUND, response.message);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllMaterialTypes(
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
    const result = await this.materialTypeService.findAllMaterialTypes(
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
  async searchMaterialTypes(
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
    const result = await this.materialTypeService.searchMaterialTypes(
      user,
      page,
      size,
      searchText
    );
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }
}
