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
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { ContactGroupService } from 'src/services/broadcast/contact-group.service';
import {
  ContactGroupDto,
  ContactToGroupDto,
  UpdateContactGroupDto,
} from 'src/dtos/broadcast/contact-group.dto';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';

@Controller('contact-group')
export class ContactGroupController {
  constructor(
    private readonly contactGroupService: ContactGroupService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async createContactGroup(
    @Body() requestDto: ContactGroupDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.contactGroupService.addContactGroup(
      user,
      requestDto,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Put('/:contact-groupId')
  async updateContactGroup(
    @Body() requestDto: UpdateContactGroupDto,
    @Param('contact-groupId') contactGroupId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.contactGroupService.updateContactGroup(
      contactGroupId,
      user,
      requestDto,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Post('/link')
  async linkContactToGroup(
    @Body() requestDto: ContactToGroupDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.contactGroupService.linkContactWithGroup(
      user,
      requestDto,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Delete('/:contactGroupId')
  async deleteContactGroup(
    @Param('contactGroupId') contactGroupId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;
    const result = await this.contactGroupService.deleteContactGroup(
      contactGroupId,
      user,
    );
    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/details/:contactGroupId')
  async getContactGroupById(
    @Param('contactGroupId') contactGroupId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const result =
      await this.contactGroupService.getContactGroupById(contactGroupId);
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/list')
  async getContactGroups(
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
    const result = await this.contactGroupService.getContactGroups(
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
  async searchContactGroups(
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
    const result = await this.contactGroupService.searchContactGroups(
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
