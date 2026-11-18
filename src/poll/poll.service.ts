import { Injectable } from "@nestjs/common";
import { setTimeout } from "timers/promises";
import { SshService, type SshConfig } from "../ssh/ssh.service.js";
import { assertSuccess } from "../ssh/exec-result.js";
import { LogFileService } from "../log_file/log_file.service.js";

export type PollLoops = Map<
  number,
  { abortPollCycle: AbortController; donePollCycle: Promise<void> }
>;

@Injectable()
export class PollService {
  private loops: PollLoops;
  constructor(
    private readonly logFileService: LogFileService,
    private readonly sshService: SshService,
  ) {
    this.loops = new Map();
  }

  async poolCycle(id: number) {
    try {
      const logFile = await this.logFileService.findOneWithServer(id);
      const config: SshConfig = {
        host: logFile.server.serverIp,
        password: logFile.server.password,
        port: logFile.server.sshPort,
        username: logFile.server.sshUser,
      };
      const result = assertSuccess(
        await this.sshService.execute(
          logFile.server.id,
          config,
          `stat -c '%i %s' ${logFile.logPath}`,
        ),
      );
      const [inode, size] = result.trim().split(" ");
      console.log("Formatted result: ", [inode, size]);
      console.log(`The result: ${result}`);
    } catch (error) {
      console.log(error);
    }
  }

  startLoop(id: number) {
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
                       Getter functions
//////////////////////////////////////////////////////////////*/
  getLops() {
    return this.loops;
  }
}
