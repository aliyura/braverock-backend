import { Body, Controller, Headers, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from '../../../services/auth/auth.service';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { UserService } from 'src/services/user/user.service';
import { UserAuthDto } from 'src/dtos/user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly userService: UserService) { }

  @Post('/login')
  async authenticateUser(
    @Body() requestDto: UserAuthDto,
    @Headers('Authorization') token: string): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    console.log('authToken:',authToken);
    const authResponse = await this.userService.authenticatePublicRequestByToken(authToken);
    if (!authResponse.success)
      return authResponse;

    const result = await this.authService.login(requestDto);
    if (result.success && result.payload) {
      return Response.send(HttpStatus.OK, result.message, result.payload);
    }
    return Response.send(HttpStatus.UNAUTHORIZED, result.message, result.payload);
  }
}
