import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '../dtos/ApiResponse.dto';
import { Messages } from '../utils/messages/messages';

/*
   This is to centralize responses sends back to frontend, this can enable the service trace each response sends to the frontend
   if there is a need in the future
*/
export class Response {
  static send(
    status: HttpStatus,
    message: string,
    payload: any = null,
  ): ApiResponse {
    const data = {
      success:
        status == HttpStatus.CREATED || status == HttpStatus.OK ? true : false,
      message,
      payload,
    } as ApiResponse;

    if (!payload) delete data.payload;
    throw new HttpException(data, status);
  }

  static success(content: any): ApiResponse {
    const data = {
      success: true,
      message: Messages.RequestSuccessful,
      payload: content,
    } as ApiResponse;
    return data;
  }

  static failure(message): ApiResponse {
    const data = {
      success: false,
      message,
    } as ApiResponse;
    return data;
  }

  static fail(message, content: any): ApiResponse {
    const data = {
      success: false,
      message,
      payload: content,
    } as ApiResponse;
    return data;
  }
}
