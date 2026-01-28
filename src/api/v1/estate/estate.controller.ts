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
import { EstateService } from 'src/services/estate/estate.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import {
  EstateDto,
  EstateEngineerDto,
  UpdateEstateDto,
} from 'src/dtos/property/estate.dto';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';

@Controller('estate')
export class EstateController {
  constructor(
    private estateService: EstateService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async addEstate(
    @Body() requestDto: EstateDto,
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
    const result = await this.estateService.addEstate(user, requestDto);
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
  @Post('/engineer')
  async addEstateEngineer(
    @Body() requestDto: EstateEngineerDto,
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
    const result = await this.estateService.addEngineer(user, requestDto);
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
  @Delete('/engineer')
  async removeEstateEngineer(
    @Body() requestDto: EstateEngineerDto,
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
    const result = await this.estateService.removeEngineer(user, requestDto);
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
  @Put('/:estateId')
  async updateEstate(
    @Body() requestDto: UpdateEstateDto,
    @Headers('Authorization') token: string,
    @Param('estateId') estateId: number,
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
    const result = await this.estateService.updateEstate(
      estateId,
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
  @Delete('/:estateId')
  async deleteEstate(
    @Headers('Authorization') token: string,
    @Param('estateId') estateId: number,
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

    const result = await this.estateService.deleteEstate(estateId, user);
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
  @Get('/details/:estateId')
  async getEstate(
    @Headers('Authorization') token: string,
    @Param('estateId') estateId: number,
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

    const result = await this.estateService.getEstateById(estateId, user);
    if (result.success) {
      return result;
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @Get('/list')
  async getAllEstates(
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
      const result = await this.estateService.findAllEstates(
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

      const result = await this.estateService.findAllPublicEstates(
        page,
        size,
        filter,
      );
      if (result.success) return result;
    }
  }

  @Get('/search')
  async searchEstates(
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
      const result = await this.estateService.searchEstates(
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

      const result = await this.estateService.searchPublicEstates(
        page,
        size,
        searchText,
        filter,
      );
      if (result.success) return result;
    }
  }
}
