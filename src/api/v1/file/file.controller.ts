import { FileService } from '../../../services/file/file.service';
import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  HttpStatus,
  UseInterceptors,
  Body,
  Headers,
  UseGuards,
  Delete,
  Param,
  Get,
  Query,
  Put,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FileDto, FilePropsDto } from 'src/dtos/file.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { UserService } from 'src/services/user/user.service';
import { Messages } from 'src/utils/messages/messages';

@Controller('file')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async createFolder(
    @Body() requestDto: FileDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!authResponse.success) return authResponse;

    const user = authResponse.payload;
    const response = await this.fileService.createFolder(user, requestDto);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @UseGuards(AppGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB max
      },
    }),
  )
  async uploadSingle(
    @UploadedFile() file,
    @Body() fileProps: FilePropsDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!authResponse.success) return authResponse;

    const user = authResponse.payload;
    const response = await this.fileService.uploadFile(user, file, fileProps);
    if (response.success) {
      return response;
    }
    return Response.send(HttpStatus.BAD_REQUEST, response.message);
  }

  @UseGuards(AppGuard)
  @Post('uploads')
  @UseInterceptors(
    FilesInterceptor('files[]', 10, {
      limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB per file
      },
    }),
  )
  async uploadMultiple(
    @UploadedFiles() files,
    @Body() fileProps: FilePropsDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const authResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!authResponse.success) return authResponse;
    const user = authResponse.payload;

    const resultSet = [];
    let isSuccessful = true;

    for (let i = 0; i < files.length; i++) {
      const response = await this.fileService.uploadFile(
        user,
        files[i],
        fileProps,
      );
      if (!response.success) isSuccessful = false;
      resultSet.push(response.payload);
    }

    if (isSuccessful) {
      return Response.success(resultSet);
    }

    return Response.send(HttpStatus.BAD_REQUEST, Messages.unableToUploadFile);
  }

  @UseGuards(AppGuard)
  @Delete('/:fileId')
  async deleteFile(
    @Headers('Authorization') token: string,
    @Param('fileId') fileId: number,
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
    const result = await this.fileService.deleteFile(user, fileId);
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
  @Put('/:fileId')
  async renameFile(
    @Headers('Authorization') token: string,
    @Param('fileId') fileId: number,
    @Query('name') name: string,
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
    const result = await this.fileService.renameFile(user, fileId, name);
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
  async getAllFiles(
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
    const result = await this.fileService.findAllFiles(
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
  async searchBills(
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
    const result = await this.fileService.searchFiles(
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
