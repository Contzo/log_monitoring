import { Controller, Post, Body, Get, Patch, Param } from "@nestjs/common";
import { ServerService } from "./server.service.js";
import { CreateServerDTO } from "./dtos/create-server.dto.js";
import { Serialize } from "../interceptors/serialize.interceptor.js";
import { ServerDTO } from "./dtos/server.dto.js";

@Controller("server")
@Serialize(ServerDTO)
export class ServerController {
  constructor(private readonly serverService: ServerService) {}
  @Post()
  addServer(@Body() newServer: CreateServerDTO) {
    return this.serverService.create(newServer);
  }

  @Get()
  find() {
    return this.serverService.findServers();
  }

  @Patch("/enable/:id")
  enableServer(@Param("id") id: string) {
    return this.serverService.enableServerConnection(parseInt(id));
  }
  @Patch("/disable/:id")
  disableServer(@Param("id") id: string) {
    return this.serverService.disableServer(parseInt(id));
  }
}
