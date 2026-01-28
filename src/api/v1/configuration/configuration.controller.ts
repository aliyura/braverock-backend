import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ConfigurationService } from 'src/services/configuration/configuration.service';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { AppGuard } from 'src/services/auth/app.guard';
import { UserService } from 'src/services/user/user.service';
import {
  CreateConfigurationDto,
  UpdateConfigurationDto,
} from 'src/dtos/configuration.dto';
import { Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';

@Controller('configuration')
export class ConfigurationController {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Get('/')
  async getConfiguration(
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, Messages.NoPermission);

    const configResponse = await this.configService.getOrCreateConfig();
    if (!configResponse.success) {
      return Response.send(HttpStatus.BAD_REQUEST, configResponse.message);
    }

    return configResponse;
  }

  @UseGuards(AppGuard)
  @Post('/')
  async createConfiguration(
    @Body() requestDto: CreateConfigurationDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, Messages.NoPermission);

    const configResponse = await this.configService.createConfig(requestDto);
    if (!configResponse.success) {
      return Response.send(HttpStatus.BAD_REQUEST, configResponse.message);
    }

    return configResponse;
  }

  @UseGuards(AppGuard)
  @Put('/')
  async updateConfiguration(
    @Body() requestDto: UpdateConfigurationDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, Messages.NoPermission);

    const updateResponse = await this.configService.updateConfig(requestDto);
    if (!updateResponse.success) {
      return Response.send(HttpStatus.BAD_REQUEST, updateResponse.message);
    }

    return updateResponse;
  }
}
