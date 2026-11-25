import { ConflictException, Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Server } from "./server.entity.js";
import { CreateServerDTO } from "./dtos/create-server.dto.js";
import { handleDbError } from "../common/db-errors.js";
import { UpdateServerDto } from "./dtos/update-server.dto.js";
import { SshService } from "../ssh/ssh.service.js";
import { stdoutText, stderrText } from "../ssh/exec-result.js";
import { Message } from "../messages/message.entity.js";
import { logError } from "../common/errorHandlers.js";

export interface ConnectionTestResult {
  ok: boolean;
  output: string;
}

@Injectable()
export class ServerService {
  private readonly serverLogger = new Logger(ServerService.name);
  constructor(
    @InjectRepository(Server)
    private readonly serverRepository: Repository<Server>,
    private readonly sshService: SshService,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
  ) {}
  async create(newServer: CreateServerDTO) {
    const enitty = this.serverRepository.create(newServer);

    try {
      return await this.serverRepository.save(enitty);
    } catch (e) {
      handleDbError(e, "Server already monitored");
    }
  }

  findServers() {
    return this.serverRepository.find();
  }

  async findOne(id: number) {
    const server = await this.serverRepository.findOne({ where: { id } });
    if (!server) throw new NotFoundException(`Server with id: ${id} not found`);
    return server;
  }

  async update(id: number, attrs: UpdateServerDto) {
    const server = await this.findOne(id);

    const connectionChanged =
      (attrs.serverIp !== undefined && attrs.serverIp !== server.serverIp) ||
      (attrs.sshPort !== undefined && attrs.sshPort !== server.sshPort) ||
      (attrs.sshUser !== undefined && attrs.sshUser !== server.sshUser);

    Object.assign(server, attrs);
    try {
      const saved = await this.serverRepository.save(server);
      if (connectionChanged) await this.sshService.closeConnection(id);
      return saved;
    } catch (error) {
      handleDbError(error, `Server with the given attributes already monitored`);
    }
  }

  async delete(id: number) {
    const server = await this.findOne(id);
    const hasMessages = await this.messageRepository.exists({
      where: { logFile: { serverId: id } },
    });
    if (hasMessages) {
      throw new ConflictException(
        `Server ${id} has stored messages. Disable its log files instead of deleting it.`,
      );
    }
    await this.serverRepository.remove(server);
    await this.sshService.closeConnection(id);
  }

  async testConnection(id: number): Promise<ConnectionTestResult> {
    const server = await this.findOne(id);
    const config = {
      host: server.serverIp,
      port: server.sshPort,
      username: server.sshUser,
    };
    try {
      const result = await this.sshService.execute(server.id, config, "uptime");
      return {
        ok: result.code === 0,
        output: result.code === 0 ? stdoutText(result) : stderrText(result),
      };
    } catch (error) {
      logError(error, this.serverLogger);
      return {
        ok: false,
        output: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
