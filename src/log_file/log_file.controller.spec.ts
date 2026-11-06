import { Test, TestingModule } from '@nestjs/testing';
import { LogFileController } from './log_file.controller.js';

describe('LogFileController', () => {
  let controller: LogFileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogFileController],
    }).compile();

    controller = module.get<LogFileController>(LogFileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
