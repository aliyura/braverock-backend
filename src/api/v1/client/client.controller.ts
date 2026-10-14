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
import { UserService } from 'src/services/user/user.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { FilterDto } from 'src/dtos/filter.dto';
import {
  CreateClientDto,
  UpdateClientDto,
  UpdateUserDto,
  UserDto,
} from 'src/dtos/user.dto';
import { Messages } from 'src/utils/messages/messages';

@Controller('client')
export class ClientController {
  constructor(private userService: UserService) {}

  @UseGuards(AppGuard)
  @Post('/')
  async createClient(
    @Body() requestDto: CreateClientDto,
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
    const result = await this.userService.createClient(user, requestDto);
    if (result.success) {
      return result;
    }
    if (result.message === Messages.NoPermission) {
      return Response.send(HttpStatus.FORBIDDEN, result.message);
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @UseGuards(AppGuard)
  @Put('/:id')
  async updateClient(
    @Body() requestDto: UpdateClientDto,
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const clientId = Number(id);
    if (!clientId || isNaN(clientId)) {
      return Response.send(HttpStatus.BAD_REQUEST, Messages.ClientNotFound);
    }

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
    const response = await this.userService.updateClient(
      user,
      clientId,
      requestDto,
    );
    if (response.success) {
      return response;
    }
    if (response.message === Messages.NoPermission) {
      return Response.send(HttpStatus.FORBIDDEN, response.message);
    }
    if (response.message === Messages.ClientNotFound) {
      return Response.send(HttpStatus.NOT_FOUND, response.message);
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @UseGuards(AppGuard)
  @Delete('/:id')
  async deleteClient(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const clientId = Number(id);
    if (!clientId || isNaN(clientId)) {
      return Response.send(HttpStatus.BAD_REQUEST, Messages.ClientNotFound);
    }

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
    const response = await this.userService.deleteClient(user, clientId);
    if (response.success) {
      return response;
    }
    if (response.message === Messages.NoPermission) {
      return Response.send(HttpStatus.FORBIDDEN, response.message);
    }
    if (response.message === Messages.ClientNotFound) {
      return Response.send(HttpStatus.NOT_FOUND, response.message);
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @UseGuards(AppGuard)
  @Get('/details/:id')
  async getClientDetails(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const clientId = Number(id);
    if (!clientId || isNaN(clientId)) {
      return Response.send(HttpStatus.BAD_REQUEST, Messages.ClientNotFound);
    }

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
    const response = await this.userService.findClientById(clientId, user);
    if (response.success) {
      return response;
    }
    if (response.message === Messages.NoPermission) {
      return Response.send(HttpStatus.FORBIDDEN, response.message);
    }
    return Response.send(HttpStatus.NOT_FOUND, response.message);
  }

  @UseGuards(AppGuard)
  @Get('/:id')
  async getClientById(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    return this.getClientDetails(id, token);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllClients(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filterDto: FilterDto,
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
    const clients = await this.userService.findAllClients(
      user,
      page,
      size,
      filterDto,
    );
    if (clients.success) return clients;
    if (clients.message === Messages.NoPermission) {
      return Response.send(HttpStatus.FORBIDDEN, clients.message);
    }
    return Response.send(HttpStatus.NOT_FOUND, clients.message);
  }

  @UseGuards(AppGuard)
  @Get('/search')
  async searchClients(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchText: string,
    @Query() filterDto: FilterDto,
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
    const clients = await this.userService.searchClients(
      user,
      page,
      size,
      filterDto,
      searchText,
    );
    if (clients.success) return clients;
    if (clients.message === Messages.NoPermission) {
      return Response.send(HttpStatus.FORBIDDEN, clients.message);
    }
    return Response.send(HttpStatus.NOT_FOUND, clients.message);
  }
}
