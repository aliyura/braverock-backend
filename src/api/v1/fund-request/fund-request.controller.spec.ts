import { Test, TestingModule } from '@nestjs/testing';
import { FundRequestController } from './fund-request.controller';

describe('FundRequestController', () => {
  let controller: FundRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundRequestController],
    }).compile();

    controller = module.get<FundRequestController>(FundRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
