import { Controller, Post, Body, Get, Param, Patch, Delete } from "@nestjs/common";
import { ServerService } from "./server.service.js";
import { CreateServerDTO } from "./dtos/create-server.dto.js";
import { Serialize } from "../interceptors/serialize.interceptor.js";
import { ServerDTO } from "./dtos/server.dto.js";
import { UpdateServerDto } from "./dtos/update-server.dto.js";

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

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return await this.serverService.findOne(parseInt(id));
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() attributes: UpdateServerDto) {
    return await this.serverService.update(parseInt(id), attributes);
  }
  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.serverService.delete(parseInt(id));
  }

  @Post("test-connection/:id")
  async testConnection(@Param("id") id: string) {
    this.serverService.testConnection(parseInt(id));
  }
}
