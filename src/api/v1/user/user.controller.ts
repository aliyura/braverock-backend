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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from 'src/services/user/user.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { Messages } from 'src/utils/messages/messages';
import { FilterDto } from 'src/dtos/filter.dto';
import {
  ResetPasswordDto,
  UpdateUserDto,
  UserDto,
  UserStatusChangeDto,
  ValidateAccountDto,
  VerifyAccountDto,
} from 'src/dtos/user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { BulkUploadPropDto } from 'src/dtos/bulk-upload.dto';
import { UserRole } from 'aws-sdk/clients/workmail';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  // @UseGuards(AppGuard)
  @Post('/superadmin')
  async createSuperAdmin(@Body() requestDto: UserDto): Promise<ApiResponse> {
    const result = await this.userService.createSuperAdmin(requestDto);
    if (result.success) {
      return result;
    }
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  @Post('/signup')
  async clientSignup(@Body() requestDto: UserDto): Promise<ApiResponse> {
    const result = await this.userService.clientSignup(requestDto);
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
  @Post('/admin')
  async createAdmin(
    @Body() requestDto: UserDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!authResponse.success) return authResponse;

    const user = authResponse.payload;
    const result = await this.userService.createAdmin(user, requestDto);
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
  @Post('/')
  async createUser(
    @Body() requestDto: UserDto,
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

    const result = await this.userService.createUser(user, requestDto);
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
    @Query('role') role: string,
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
    const result = await this.userService.bulkUploadUsers(
      file.buffer,
      role,
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

  @Post('/verify-identity')
  async verifyIdentity(
    @Body() requestDto: VerifyAccountDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatePublicRequestByToken(authToken);
    if (!authResponse.success) return authResponse;

    const response = await this.userService.verifyIdentity(requestDto);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @Post('/forgot-password')
  async forgotPassword(
    @Body() requestDto: ValidateAccountDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatePublicRequestByToken(authToken);
    if (!authResponse.success) return authResponse;

    const response = await this.userService.validateAccount(requestDto);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @Post('/verify-account')
  async verifyAccount(
    @Body() requestDto: VerifyAccountDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatePublicRequestByToken(authToken);
    if (!authResponse.success) return authResponse;

    const response = await this.userService.verifyAccount(requestDto);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @Post('/reset-password')
  async resetPassword(
    @Body() requestDto: ResetPasswordDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatePublicRequestByToken(authToken);
    if (!authResponse.success) return authResponse;

    const response = await this.userService.resetPassword(requestDto);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @UseGuards(AppGuard)
  @Put('/status-change/:userId')
  async updateUserStatus(
    @Body() requestDto: UserStatusChangeDto,
    @Param('userId') userId: number,
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

    const response = await this.userService.updateUserStatus(
      user,
      userId,
      requestDto,
    );
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @UseGuards(AppGuard)
  @Put('/:userId')
  async updateUser(
    @Body() requestDto: UpdateUserDto,
    @Param('userId') userId: number,
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

    const response = await this.userService.updateUser(
      user,
      userId,
      requestDto,
    );
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @UseGuards(AppGuard)
  @Delete('/:userId')
  async deleteUser(
    @Param('userId') userId: number,
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

    const response = await this.userService.deleteUser(user, userId);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @UseGuards(AppGuard)
  @Get('/details/:id')
  async getUserDetails(@Param('id') id: number): Promise<ApiResponse> {
    const response = await this.userService.findByUserId(id);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.NOT_FOUND, Messages.UserNotFound);
  }

  @UseGuards(AppGuard)
  @Get('/detail')
  async getUser(
    @Query('id') id: number,
    @Query('emailAddress') emailAddress: string,
    @Query('phoneNumber') phoneNumber: string,
  ): Promise<ApiResponse> {
    const response = await this.userService.findByUserByUniqueKey(
      id,
      emailAddress,
      phoneNumber,
    );
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.NOT_FOUND, Messages.UserNotFound);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllUsers(
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
    const users = await this.userService.findAllUsers(
      user,
      page,
      size,
      filterDto,
    );
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }

  @UseGuards(AppGuard)
  @Get('/search')
  async searchUsers(
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

    const users = await this.userService.searchUsers(
      user,
      page,
      size,
      filterDto,
      searchText,
    );
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }
}
