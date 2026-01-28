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
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { ContactService } from 'src/services/broadcast/contact.service';
import { ContactDto, UpdateContactDto } from 'src/dtos/broadcast/contact.dto';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async createContact(
    @Body() requestDto: ContactDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.contactService.addContact(user, requestDto);
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPlots(
    @UploadedFile() file,
    @Query('groupId') groupId: number,
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
    const result = await this.contactService.bulkUploadContacts(
      file.buffer,
      groupId,
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
  @Put('/:contactId')
  async updateContact(
    @Body() requestDto: UpdateContactDto,
    @Param('contactId') contactId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.contactService.updateContact(
      contactId,
      user,
      requestDto,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Delete('/:contactId')
  async deleteContact(
    @Param('contactId') contactId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.contactService.deleteContact(contactId, user);
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/details/:contactId')
  async getContactById(
    @Param('contactId') contactId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const result = await this.contactService.getContactById(contactId);
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getContacts(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.contactService.getContacts(
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
  async searchContacts(
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
    const result = await this.contactService.searchContacts(
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
