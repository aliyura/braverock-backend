import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { UserService } from 'src/services/user/user.service';
import { AnalyticService } from 'src/services/analytic/analytic.service';
import { FilterDto } from 'src/dtos/filter.dto';

@Controller('analytic')
export class AnalyticController {
  constructor(
    private analyticService: AnalyticService,
    private userService: UserService,
  ) { }

  @UseGuards(AppGuard)
  @Get('/')
  async getAllAnalytics(
    @Query() filterDto: FilterDto,
    @Headers('Authorization') token: string, 
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const users = await this.analyticService.findAllAnalytics(user, filterDto);
    if (users.success) return users;
    return Response.send(HttpStatus.NOT_FOUND, users.message);
  }
}
