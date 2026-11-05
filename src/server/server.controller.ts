import { Controller, Post, Body, Get } from '@nestjs/common';
import { ServerService } from './server.service.js';
import { CreateServerDTO } from './dtos/create-server.dto.js';
import { Serialize } from '../interceptors/serialize.interceptor.js';
import { ServerDTO } from './dtos/server.dto.js';

@Controller('server')
@Serialize(ServerDTO)
export class ServerController {
  constructor(private readonly serverService: ServerService) {}
  @Post('create')
  addServer(@Body() newServer: CreateServerDTO) {
    return this.serverService.create(newServer);
  }

  @Get()
  find() {
    return this.serverService.findServers();
  }
}
