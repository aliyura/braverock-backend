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
import { SuspensionService } from 'src/services/hr/suspension.service';
import { UserService } from 'src/services/user/user.service';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { AppGuard } from 'src/services/auth/app.guard';
import { Response } from 'src/helpers';
import { SuspensionDto, UpdateSuspensionDto } from 'src/dtos/hr/suspension.dto';

@Controller('suspension')
export class SuspensionController {
  constructor(
    private suspensionService: SuspensionService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async issueSuspension(
    @Body() dto: SuspensionDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.suspensionService.suspendEmployee(
      auth.payload,
      dto,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 2. UPDATE SUSPENSION
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Put('/:id')
  async updateSuspension(
    @Param('id') id: number,
    @Body() dto: UpdateSuspensionDto,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.suspensionService.updateSuspension(
      id,
      auth.payload,
      dto,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 3. COMPLETE SUSPENSION
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Post('/complete/:id')
  async completeSuspension(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.suspensionService.completeSuspension(
      id,
      auth.payload,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 4. REVOKE SUSPENSION
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Post('/revoke/:id')
  async revokeSuspension(
    @Param('id') id: number,
    @Body('remarks') remarks: string,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.suspensionService.revokeSuspension(
      id,
      auth.payload,
      remarks,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 5. DELETE SUSPENSION
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Delete('/:id')
  async deleteSuspension(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.suspensionService.deleteSuspension(
      id,
      auth.payload,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 6. GET DETAILS
  // ---------------------------------------------
  @Get('/details/:id')
  async getSuspensionById(@Param('id') id: number) {
    const result = await this.suspensionService.getSuspensionById(id);
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ---------------------------------------------
  // 7. LIST (PAGINATED)
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Get('/list')
  async listSuspensions(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.suspensionService.findAllSuspensions(
      auth.payload,
      page,
      size,
      filter,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ---------------------------------------------
  // 8. SEARCH
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Get('/search')
  async searchSuspensions(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') q: string,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.suspensionService.searchSuspensions(
      auth.payload,
      page,
      size,
      q,
      filter,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ---------------------------------------------
  // 9. EXPORT CSV
  // ---------------------------------------------
  @Get('/export')
  async exportCsv(@Query() filter: FilterDto): Promise<ApiResponse> {
    const result = await this.suspensionService.exportSuspensionsCsv(filter);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }
}
