import { Injectable } from "@nestjs/common";
import { SshService, type SshConfig } from "../ssh/ssh.service.js";
import { LogFile } from "../log_file/log_file.entity.js";
import { assertSuccess } from "../ssh/exec-result.js";
import { isNumber } from "class-validator";

export interface RemoteLogState {
  inode: string;
  size: number;
}
@Injectable()
export class RemoteLogReaderService {
  constructor(private readonly sshService: SshService) {}

  async getRemoteLogStat(logFile: LogFile): Promise<RemoteLogState> {
    const sshConfig = this.getSshConfigFromLogFile(logFile);
    const result = assertSuccess(
      await this.sshService.execute(
        logFile.serverId,
        sshConfig,
        `stat -c '%i %s' ${logFile.logPath}`,
      ),
    );
    const [inode, size] = result.trim().split(" ");
    if (!inode || !isNumber(parseInt(size)))
      throw new Error(`File ${logFile.logPath} inode or size not valid`);
    return {
      inode,
      size: parseInt(size),
    };
  }

  async getRemoteMessage(logFile: LogFile): Promise<string> {
    const sshConfig = this.getSshConfigFromLogFile(logFile);
    const result = assertSuccess(
      await this.sshService.execute(
        logFile.serverId,
        sshConfig,
        `tail -c +${logFile.byteOffset + 1} ${logFile.logPath} | head -c 65536`,
      ),
    );
    return result;
  }

  /*//////////////////////////////////////////////////////////////
                       Private functions
//////////////////////////////////////////////////////////////*/
  private getSshConfigFromLogFile(logFile: LogFile): SshConfig {
    return {
      password: logFile.server.password,
      username: logFile.server.sshUser,
      port: logFile.server.sshPort,
      host: logFile.server.serverIp,
    };
  }
}
