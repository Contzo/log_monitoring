import { Injectable } from "@nestjs/common";
import { setTimeout } from "timers/promises";
import { LogFileService } from "../log_file/log_file.service.js";
import { RemoteLogReaderService } from "./RemoteLogReader.service.js";
import { decideCursor } from "./cursor-decision.js";

export type PollLoops = Map<
  number,
  {
    abortPollCycle: AbortController;
    donePollCycle: Promise<void>;
  }
>;

@Injectable()
export class PollService {
  private loops: PollLoops;
  constructor(
    private readonly logFileService: LogFileService,
    private readonly remoteLogReaderService: RemoteLogReaderService,
  ) {
    this.loops = new Map();
  }
  async poolCycle(id: number) {
    try {
      const logFile = await this.logFileService.findOneWithServer(id);
      const { inode, size } = await this.remoteLogReaderService.getRemoteLogStat(logFile);
      const cursorDecision = decideCursor(
        { inode: logFile.inode, offset: logFile.byteOffset },
        { inode, size },
      );
      if (cursorDecision.kind === `nothing`) return;
      console.log("Cursor Decision", cursorDecision);

      console.log("Formatted result: ", [inode, size]);
    } catch (error) {
      console.log(error);
    }
  }

  async startLoop(id: number) {
    if (this.loops.has(id)) return; // loop already running
    const abortPollCycle = new AbortController();
    const donePollCycle = this.runLoop(id, abortPollCycle).finally(() => {
      if (this.loops.get(id)?.abortPollCycle === abortPollCycle) this.loops.delete(id);
    });
    this.loops.set(id, { abortPollCycle, donePollCycle });
  }

  private async runLoop(id: number, abortController: AbortController) {
    const { signal } = abortController;
    try {
      while (!signal.aborted) {
        await this.poolCycle(id);
        await setTimeout(1000, undefined, { signal });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log(`File monitoring for: ${id} aborted`);
      } else {
        console.log(`Poll loop for file ${id} failed`, error);
      }
    }
  }

  stopLoop(id: number) {
    const controller = this.loops.get(id);
    if (!controller) return;
    controller.abortPollCycle.abort();
  }

  /*//////////////////////////////////////////////////////////////
                       Private functions
//////////////////////////////////////////////////////////////*/

  /*//////////////////////////////////////////////////////////////
                       Private functions
//////////////////////////////////////////////////////////////*/
  /*//////////////////////////////////////////////////////////////
                       Getter functions
//////////////////////////////////////////////////////////////*/
  getLops() {
    return this.loops;
  }
}
