import { Injectable } from '@nestjs/common';
import { CursorService } from '../cursor/cursor.service.js';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class PollService implements OnModuleInit {
  constructor(private cursorsService: CursorService) {}

  onModuleInit() {
    this.loop().catch((error) => console.log(error));
  }

  async pollCycle() {}

  async loop() {
    // make a loop for each server
    while (true) {
      try {
        await this.pollCycle();
        await new Promise((resolve) => setTimeout(resolve, 1000)); // make an abort controller for this
      } catch (error) {}
    }
  }
}
