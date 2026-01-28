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
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { AppGuard } from 'src/services/auth/app.guard';
import { Response } from 'src/helpers';
import {
  QueryLetterDto,
  UpdateQueryLetterDto,
} from 'src/dtos/hr/query-letter.dto';
import { QueryLetterService } from 'src/services/hr/query-letter.service';

@Controller('query-letter')
export class QueryLetterController {
  constructor(
    private queryService: QueryLetterService,
    private userService: UserService,
  ) {}

  // ---------------------------------------------
  // 1. ISSUE QUERY LETTER
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Post('/')
  async issueQueryLetter(
    @Body() dto: QueryLetterDto,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.queryService.sendQueryLetter(auth.payload, dto);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 2. UPDATE QUERY LETTER
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Put('/:id')
  async updateQueryLetter(
    @Param('id') id: number,
    @Body() dto: UpdateQueryLetterDto,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.queryService.updateQueryLetter(
      id,
      auth.payload,
      dto,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 3. ACKNOWLEDGE QUERY (EMPLOYEE)
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Post('/acknowledge/:id')
  async acknowledgeQuery(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.queryService.acknowledgeQueryLetter(
      id,
      auth.payload,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 4. REVOKE QUERY LETTER
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Post('/revoke/:id')
  async revokeQuery(
    @Param('id') id: number,
    @Body('remarks') remarks: string,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.queryService.revokeQueryLetter(
      id,
      auth.payload,
      remarks,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 5. DELETE QUERY LETTER
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Delete('/:id')
  async deleteQueryLetter(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ) {
    const auth = await this.userService.authenticatedUserByToken(
      token?.substring(7),
    );
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message);

    const result = await this.queryService.deleteQueryLetter(id, auth.payload);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ---------------------------------------------
  // 6. GET DETAILS
  // ---------------------------------------------
  @Get('/details/:id')
  async getQueryLetterById(@Param('id') id: number) {
    const result = await this.queryService.getQueryLetterById(id);
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ---------------------------------------------
  // 7. LIST (PAGINATED)
  // ---------------------------------------------
  @UseGuards(AppGuard)
  @Get('/list')
  async listQueryLetters(
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

    const result = await this.queryService.findAllQueryLetters(
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
  async searchQueryLetters(
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

    const result = await this.queryService.searchQueryLetters(
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
    const result = await this.queryService.exportQueryLettersCsv(filter);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }
}
