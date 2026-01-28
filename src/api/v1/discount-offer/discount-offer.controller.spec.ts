import { Test, TestingModule } from '@nestjs/testing';
import { DiscountOfferController } from './discount-offer.controller';

describe('DiscountOfferController', () => {
  let controller: DiscountOfferController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscountOfferController],
    }).compile();

    controller = module.get<DiscountOfferController>(DiscountOfferController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
