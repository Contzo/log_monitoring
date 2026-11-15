import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Server } from "./server.entity.js";
import { CreateServerDTO } from "./dtos/create-server.dto.js";
import { handleDbError } from "../common/db-errors.js";
import { SshService } from "../ssh/ssh.service.js";
import { Client } from "ssh2";

export type ServerConnecitonMapType = Map<number, Client>;
@Injectable()
export class ServerService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  serverConnections: ServerConnecitonMapType;
  constructor(
    @InjectRepository(Server)
    private readonly serverRepository: Repository<Server>,
    private readonly sshService: SshService,
  ) {
    this.serverConnections = new Map();
  }
  async onApplicationBootstrap() {
    const enabledServers = await this.serverRepository.find({ where: { isEnabled: true } });
    enabledServers.forEach(
      async (server) =>
        await this.sshService.connectToServer({
          host: server.serverIp,
          port: server.sshPort,
          username: server.sshUser,
          password: server.password,
        }),
    );
  }

  beforeApplicationShutdown() {
    this.serverConnections.forEach((client) => client.end());
  }
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

  async enableServerConnection(id: number) {
    const server = await this.serverRepository.findOne({ where: { id } });
    if (!server) throw new NotFoundException("Server not added");
    let newSshConneciton;
    try {
      newSshConneciton = await this.sshService.connectToServer({
        host: server.serverIp,
        port: server.sshPort,
        username: server.sshUser,
        password: server.password,
      });
      server.isEnabled = true;
      server.lastSuccessAt = new Date();
      server.lastErrorAt = null;
      server.lastError = null;
      this.serverConnections.set(id, newSshConneciton);
      return await this.serverRepository.save(server);
    } catch (error) {
      server.lastErrorAt = new Date();
      server.lastErrorAt = new Date();
      await this.serverRepository.save(server);

      const message = error instanceof Error ? error.message : "Unknown connection error";
      throw new ServiceUnavailableException(
        `Cannot connect to server ${server.serverIp}:${server.sshPort}: ${message}`,
      );
    }
  }

  async disableServer(id: number) {
    const server = await this.serverRepository.findOne({ where: { id } });
    if (!server) throw new NotFoundException("Server not added");
    server.isEnabled = false;
    const connection = this.serverConnections.get(id);
    if (!connection) throw new NotFoundException("Server not connected");
    connection.end();
    this.serverConnections.delete(id);
    return this.serverRepository.save(server);
  }
}
