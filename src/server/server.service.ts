import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Server } from "./server.entity.js";
import { CreateServerDTO } from "./dtos/create-server.dto.js";
import { handleDbError } from "../common/db-errors.js";
import { UpdateServerDto } from "./dtos/update-server.dto.js";
import { SshService } from "../ssh/ssh.service.js";
import { stdoutText, stderrText } from "../ssh/exec-result.js";

export interface ConnectionTestResult {
  ok: boolean;
  output: string;
}
@Injectable()
export class ServerService {
  constructor(
    @InjectRepository(Server)
    private readonly serverRepository: Repository<Server>,
    private readonly sshService: SshService,
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
    const server = await this.serverRepository.findOne({ where: { id } });
    if (!server) throw new NotFoundException(`Server ${id} not found`);

    Object.assign(server, attrs);
    return this.serverRepository.save(server);
  }

  async delete(id: number) {
    const server = await this.findOne(id);
    return this.serverRepository.remove(server);
  }

  async testConnection(id: number): Promise<ConnectionTestResult> {
    const server = await this.findOne(id);
    const config = {
      host: server.serverIp,
      port: server.sshPort,
      username: server.sshUser,
    };
    const result = await this.sshService.execute(server.id, config, "uptime");
    return {
      ok: result.code === 0 ? true : false,
      output: result.code === 0 ? stdoutText(result) : stderrText(result),
    };
  }
}
