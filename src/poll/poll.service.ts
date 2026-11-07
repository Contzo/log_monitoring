import {
  Injectable,
  OnApplicationBootstrap,
  Inject,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { setTimeout } from 'timers/promises';

@Injectable()
export class PollService {
  constructor() {}

  // async onApplicationBootstrap() {
  //   this.pollControllerMap.forEach((pollController) => {
  //     this.startLoop(pollController);
  //   });
  // }
  //
  // beforeApplicationShutdown(_signal?: string) {
  //   this.pollControllerMap.forEach((pollController) => {
  //     this.stopLoop(pollController);
  //   });
  // }
  //
  // pollCycle(id: number) {
  //   console.log(`poolCylce executed for file with id: ${id}`);
  // }
  //
  // async startLoop(poll: PoolController) {
  //   // make a loop for each server
  //   poll.enabled = true;
  //   console.log(`Started loop for file: ${poll.fileId}`);
  //   while (poll.enabled) {
  //     try {
  //       this.pollCycle(poll.fileId);
  //       await setTimeout(1000, undefined, {
  //         signal: poll.abortController.signal,
  //       });
  //     } catch (error) {}
  //   }
  // }
  //
  // stopLoop(poll: PoolController) {
  //   poll.abortController.abort();
  //   poll.enabled = false;
  //   console.log(`Stoped loop for file: ${poll.fileId}`);
  // }
}
