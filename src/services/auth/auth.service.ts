import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { User } from '../../schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import { UserAuthDto } from '../../dtos/user.dto';
import { AuthProvider, NotificationCategory, StateStatus } from 'src/enums';
import { Messages } from 'src/utils/messages/messages';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers/responseHandler.helpers';
import { CryptoService } from '../crypto/crypto.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationDto } from 'src/dtos/notification.dto';
import { ProducerService } from 'src/queue/producer.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private userService: UserService,
    private jwtService: JwtService,
    private encryptionService: CryptoService,
    private queueProducerService: ProducerService,
  ) { }

  async validateUser(authRequest: UserAuthDto): Promise<ApiResponse> {
    try {
      const res = await this.userService.findByUser(authRequest.username);
      if (res.success) {
        const user = res.payload as User;
        user.lastLoginAt = new Date();
        this.userRepo.save(user);

        if (user.status == StateStatus.ACTIVE) {
          return Response.success(user);
        } else {
          return Response.fail(`Your account is ${user.status.toLowerCase()}`, user);
        }
      }
      return Response.failure(Messages.InvalidCredentials);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async login(authRequest: UserAuthDto): Promise<ApiResponse> {
    try {
      const res = await this.validateUser(authRequest);
      if (res.success) {
        const user = res.payload as User;
        const payload = { username: authRequest.username, sub: user.id };

        let valid = false;
        if (authRequest.authProvider == AuthProvider.EXTERNAL) {
          console.log('External login');
          if (user.authProvider == AuthProvider.EXTERNAL) {
            if (user.authToken == authRequest.password) {
              valid = true;
            }
          }
        } else {
          console.log('Internal login');
          valid = await this.encryptionService.compare(
            user.password,
            authRequest.password,
          );
        }

        if (!valid) return Response.failure(Messages.InvalidCredentials);

        user.lastLoginAt = new Date();
        await this.userRepo.save(user);

        delete user.password;
        delete user.updateHistory;

        const token = {
          accessToken: this.jwtService.sign(payload),
          user,
        };

        //send notification to user
        const notification = {
          from: 0,
          to: user,
          subject: 'Login Successful',
          body: `Your account accessed on ${new Date()}`,
          enableEmail: true,
          enableSMS: true,
          category: NotificationCategory.LOGIN,
        } as NotificationDto;

        this.queueProducerService.publishNotification(notification);

        return Response.success(token);
      } else {
        return res;
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
