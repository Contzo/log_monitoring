import { Test, TestingModule } from '@nestjs/testing';
import { SshService } from './ssh.service.js';

describe('SshService', () => {
  let service: SshService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SshService],
    }).compile();

    service = module.get<SshService>(SshService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
