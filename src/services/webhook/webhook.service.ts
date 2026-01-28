import { Injectable } from '@nestjs/common';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Webhook } from '../../schemas/webhook.schema';
import { Response } from 'src/helpers';
import { Payment } from 'src/schemas/sale/payment.schema';
import { StateStatus } from 'src/enums';

@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(Webhook) private webhookRepo: Repository<Webhook>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) { }

  async savePaystackWebhook(webhook: any): Promise<ApiResponse> {
    try {
      const data = webhook.data;
      console.log('saving webhook request');

      const request = {
        status: data.status,
        reference: data.reference,
        currency: data.currency,
        channel: data.channel,
        amount: data.amount / 100,
        gateway: 'Paystack',
        paidAt: data.paid_at,
        gatewayResponse: data.gateway_response,
        ipAddress: data.ip_address,
        saleId: Number(data.metadata.saleId),
        userId: Number(data.metadata.userId),
        payload: JSON.stringify(webhook),
      } as unknown as Webhook;

      const paymentRequest = {
        amount: request.amount,
        transactionRef: request.reference,
        status: StateStatus.PAID,
        saleId: request.saleId,
        paymentMethod: request.channel,
        narration: 'Paystack'
      } as unknown as Payment

      await this.paymentRepo.save(paymentRequest);

      const webhookResponse = await this.webhookRepo.save(request);
      return Response.success(webhookResponse);
    } catch (ex) {
      console.log(ex);
      return Response.failure('Unable to save webhook');
    }
  }
}
