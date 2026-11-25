import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { setTimeout } from "timers/promises";
import { LogFileService } from "../log_file/log_file.service.js";
import { RemoteLogReaderService } from "./RemoteLogReader.service.js";
import { decideCursor } from "./cursor-decision.js";
import { parseCompleteLines } from "./parse-lines.js";
import { logError } from "../common/errorHandlers.js";
import { MessagesService } from "../messages/messages.service.js";
import { DataSource } from "typeorm";

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
  private pollLogger = new Logger("PollService");
  constructor(
    private readonly logFileService: LogFileService,
    private readonly remoteLogReaderService: RemoteLogReaderService,
    private readonly messagesService: MessagesService,
    private readonly dataSource: DataSource,
  ) {
    this.loops = new Map();
  }
  async poolCycle(id: number): Promise<"continue" | "stop"> {
    try {
      const logFile = await this.logFileService.findOneWithServer(id);
      const { inode, size } = await this.remoteLogReaderService.getRemoteLogStat(logFile);
      const cursorDecision = decideCursor(
        { inode: logFile.inode, offset: logFile.byteOffset },
        { inode, size },
      );
      if (cursorDecision.kind === `nothing`) return "continue";
      this.pollLogger.debug(`Cursor Decision: ${cursorDecision.kind}`);
      const generation =
        cursorDecision.kind === "reset" ? logFile.generation + 1 : logFile.generation;
      const chunk = await this.remoteLogReaderService.getRemoteBytes(logFile, cursorDecision.from);
      const { lines, consumedBytes } = parseCompleteLines(chunk, cursorDecision.from);
      this.pollLogger.debug(`New lines: ${lines.length} consumed bytes: ${consumedBytes}`);
      const newOffset = cursorDecision.from + consumedBytes;
      await this.dataSource.transaction(async (manager) => {
        await this.messagesService.insertBatch(logFile.id, generation, lines, manager);
        await this.logFileService.saveCursor(
          logFile.id,
          {
            inode,
            byteOffset: newOffset,
            generation,
          },
          manager,
        );
      });
      if (cursorDecision.kind === "reset") {
        this.pollLogger.log(
          `Cursor reset for file ${id} (${logFile.logPath}): now generation ${generation}`,
        );
      }
      return "continue";
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.pollLogger.warn(`Log file ${id} no longer exists, stopping its loop`);
        return "stop";
      }
      logError(error, this.pollLogger, `Poll cycle for file ${id} failed`);
      return "continue";
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
        const result = await this.poolCycle(id);
        if (result === "stop") return;
        await setTimeout(1000, undefined, { signal });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        this.pollLogger.log(`Poll loop for file ${id} stopped`);
      } else {
        logError(error, this.pollLogger, `Poll loop for file ${id} failed`);
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
