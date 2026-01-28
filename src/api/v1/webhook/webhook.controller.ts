import { Body, Controller, Headers, HttpStatus, Post } from '@nestjs/common';
import { WebhookService } from 'src/services/webhook/webhook.service';
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';

@Controller('webhook')
export class WebhookController {
  constructor(
    private webhookService: WebhookService,
  ) { }

  @Post('/paystack')
  async addUnitByPaystack(
    @Body() webhook: any,
    @Headers() headers,
  ): Promise<ApiResponse> {
    console.log('paystack webhook arrived...');
    const data = webhook != null ? webhook.data : null;

    if (data != null && data.status == 'success') {

      const response = await this.webhookService.savePaystackWebhook(webhook);

      return Response.success(response);

    } else {
      console.log('Failed transaction');
    }
  }
}
