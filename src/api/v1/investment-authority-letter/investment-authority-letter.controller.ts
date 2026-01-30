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
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { AuthorityLetterService } from 'src/services/investment/investment-authority-letter.service';
import {
    AuthorityLetterDto,
    UpdateAuthorityLetterDto,
} from 'src/dtos/investment/authority-letter.dto';
import { UpdateStatusDto } from 'src/dtos/master';

@Controller('investment-authority-letter')
export class AuthorityLetterController {
    constructor(
        private authorityLetterService: AuthorityLetterService,
        private userService: UserService,
    ) { }

    @UseGuards(AppGuard)
    @Post('/')
    async addAuthorityLetter(
        @Body() requestDto: AuthorityLetterDto,
        @Headers('Authorization') token: string,
    ): Promise<ApiResponse> {
        const authToken = token && token.substring(7);
        const userResponse = await this.userService.authenticatedUserByToken(
            authToken,
        );
        if (!userResponse.success)
            return Response.send(
                HttpStatus.UNAUTHORIZED,
                userResponse.message,
                userResponse.payload,
            );

        const user = userResponse.payload;
        const result = await this.authorityLetterService.addAuthorityLetter(
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
    @Put('/:letterId')
    async updateAuthorityLetter(
        @Body() requestDto: UpdateAuthorityLetterDto,
        @Headers('Authorization') token: string,
        @Param('letterId') letterId: number,
    ): Promise<ApiResponse> {
        const authToken = token && token.substring(7);
        const userResponse = await this.userService.authenticatedUserByToken(
            authToken,
        );
        if (!userResponse.success)
            return Response.send(
                HttpStatus.UNAUTHORIZED,
                userResponse.message,
                userResponse.payload,
            );

        const user = userResponse.payload;
        const result = await this.authorityLetterService.updateAuthorityLetter(
            user,
            letterId,
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
    @Post('/status/:letterId')
    async updateAuthorityLetterStatus(
        @Body() requestDto: UpdateStatusDto,
        @Headers('Authorization') token: string,
        @Param('letterId') letterId: number,
    ): Promise<ApiResponse> {
        const authToken = token && token.substring(7);
        const userResponse = await this.userService.authenticatedUserByToken(
            authToken,
        );
        if (!userResponse.success)
            return Response.send(
                HttpStatus.UNAUTHORIZED,
                userResponse.message,
                userResponse.payload,
            );

        const user = userResponse.payload;
        const result = await this.authorityLetterService.updateAuthorityLetterStatus(
            letterId,
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
    @Delete('/:letterId')
    async deleteAuthorityLetter(
        @Headers('Authorization') token: string,
        @Param('letterId') letterId: number,
    ): Promise<ApiResponse> {
        const authToken = token && token.substring(7);
        const userResponse = await this.userService.authenticatedUserByToken(
            authToken,
        );
        if (!userResponse.success)
            return Response.send(
                HttpStatus.UNAUTHORIZED,
                userResponse.message,
                userResponse.payload,
            );

        const user = userResponse.payload;

        const result = await this.authorityLetterService.deleteAuthorityLetter(
            letterId,
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
    @Get('/detail')
    async getAuthorityLetter(
        @Headers('Authorization') token: string,
        @Query('id') letterId: number,
    ): Promise<ApiResponse> {
        const authToken = token && token.substring(7);
        const userResponse = await this.userService.authenticatedUserByToken(
            authToken,
        );
        if (!userResponse.success)
            return Response.send(
                HttpStatus.UNAUTHORIZED,
                userResponse.message,
                userResponse.payload,
            );

        const user = userResponse.payload;

        const result = await this.authorityLetterService.getAuthorityLetterById(
            letterId,
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
    @Get('/list')
    async getAllAuthorityLetters(
        @Query('page') page: number,
        @Query('size') size: number,
        @Query() filter: FilterDto,
        @Headers('Authorization') token: string,
    ): Promise<ApiResponse> {
        const authToken = token && token.substring(7);
        const userResponse = await this.userService.authenticatedUserByToken(
            authToken,
        );
        if (!userResponse.success)
            return Response.send(
                HttpStatus.UNAUTHORIZED,
                userResponse.message,
                userResponse.payload,
            );

        const user = userResponse.payload;
        const result = await this.authorityLetterService.findAllAuthorityLetters(
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
    async searchAuthorityLetters(
        @Query('page') page: number,
        @Query('size') size: number,
        @Query('q') searchText: string,
        @Query() filter: FilterDto,
        @Headers('Authorization') token: string,
    ): Promise<ApiResponse> {
        const authToken = token && token.substring(7);
        const userResponse = await this.userService.authenticatedUserByToken(
            authToken,
        );
        if (!userResponse.success)
            return Response.send(
                HttpStatus.UNAUTHORIZED,
                userResponse.message,
                userResponse.payload,
            );

        const user = userResponse.payload;
        const result = await this.authorityLetterService.searchAuthorityLetters(
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
