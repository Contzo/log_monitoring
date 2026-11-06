import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, FindOptionsRelations } from 'typeorm';
import { Server } from './server.entity.js';
import { CreateServerDTO } from './dtos/create-server.dto.js';

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
      console.log(e);
      if (
        e instanceof QueryFailedError &&
        e.driverError.code === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        throw new ConflictException('Server name or ip aleady monitored');
      }
      throw e;
    }
  }

  findServers() {
    return this.serverRepository.find();
  }

  findOne(serverName: string, relations?: FindOptionsRelations<Server>) {
    return this.serverRepository.findOne({ where: { serverName }, relations });
  }
}
