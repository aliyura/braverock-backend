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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { HouseService } from 'src/services/house/house.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { HouseDto, UpdateHouseDto } from 'src/dtos/property/house.dto';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer';

@Controller('house')
export class HouseController {
  constructor(
    private houseService: HouseService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async addHouse(
    @Body() requestDto: HouseDto,
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

    const result = await this.houseService.addHouse(user, requestDto);
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
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPlots(
    @UploadedFile() file,
    @Query('estateId') estateId: number,
    @Headers('Authorization') token: string,
  ) {
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
    const result = await this.houseService.bulkUploadHouses(
      file.buffer,
      estateId,
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
  @Put('/:houseId')
  async updateHouse(
    @Body() requestDto: UpdateHouseDto,
    @Headers('Authorization') token: string,
    @Param('houseId') houseId: number,
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

    const result = await this.houseService.updateHouse(
      houseId,
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
  @Delete('/:houseId')
  async deleteHouse(
    @Headers('Authorization') token: string,
    @Param('houseId') houseId: number,
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

    const result = await this.houseService.deleteHouse(houseId, user);
    if (result.success) {
      return result;
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @Get('/details/:id')
  async getHouseById(
    @Headers('Authorization') token: string,
    @Param('id') houseId: number,
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

    const result = await this.houseService.getHouseById(houseId);
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  @Get('/list')
  async getAllHouses(
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
      const result = await this.houseService.findAllHouses(
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

      const result = await this.houseService.findAllPublicHouses(
        page,
        size,
        filter,
      );
      if (result.success) return result;
      return Response.send(HttpStatus.NOT_FOUND, result.message);
    }
  }

  @Get('/search')
  async searchHouses(
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
      const result = await this.houseService.searchHouses(
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

      const result = await this.houseService.searchPublicHouses(
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
