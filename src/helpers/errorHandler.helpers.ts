import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    let status, resObj;
    try {
      if (exception instanceof HttpException) {
        resObj = exception.getResponse();
        status = exception.getStatus();
      } else {
        const err = exception as any;
        resObj.status = HttpStatus.INTERNAL_SERVER_ERROR;
        resObj.message = 'Sorry, we are unable to process your request';
        resObj.payload = {
          message: err.message,
          stack: err.stack,
        };
      }
      return response.status(status).json(resObj);
    }
    catch (ex) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(resObj);
    }
  }
}
