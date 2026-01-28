import { Test, TestingModule } from '@nestjs/testing';
import { PlotController } from './plot.controller';

describe('PlotController', () => {
  let controller: PlotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlotController],
    }).compile();

    controller = module.get<PlotController>(PlotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
