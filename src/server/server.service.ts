import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Server } from "./server.entity.js";
import { CreateServerDTO } from "./dtos/create-server.dto.js";
import { handleDbError } from "../common/db-errors.js";

@Injectable()
export class ServerService {
  constructor(
    @InjectRepository(Server)
    private readonly serverRepository: Repository<Server>,
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

  findOne(serverName: string) {
    return this.serverRepository.findOne({ where: { serverName } });
  }

  async findOneOrFail(serverName: string) {
    const server = await this.serverRepository.findOne({
      where: { serverName },
    });
    if (!server) throw new NotFoundException("Server not monitored");
    return server;
  }
  async update(id: number, attrs: Partial<Server>) {
    const server = await this.serverRepository.findOne({ where: { id } });
    if (!server) throw new NotFoundException(`Server ${id} not found`);

    Object.assign(server, attrs);
    return this.serverRepository.save(server);
  }
}
