import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  HttpCode,
} from "@nestjs/common";
import { ServerService } from "./server.service.js";
import { CreateServerDTO } from "./dtos/create-server.dto.js";
import { Serialize } from "../interceptors/serialize.interceptor.js";
import { ServerDTO } from "./dtos/server.dto.js";
import { UpdateServerDto } from "./dtos/update-server.dto.js";
import { TestConnectionDto } from "./dtos/test-connection.dto.js";

@Controller("server")
export class ServerController {
  constructor(private readonly serverService: ServerService) {}
  @Serialize(ServerDTO)
  @Post()
  addServer(@Body() newServer: CreateServerDTO) {
    return this.serverService.create(newServer);
  }

  @Serialize(ServerDTO)
  @Get()
  find() {
    return this.serverService.findServers();
  }

  @Serialize(ServerDTO)
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return await this.serverService.findOne(id);
  }

  @Serialize(ServerDTO)
  @Patch(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() attributes: UpdateServerDto) {
    return await this.serverService.update(id, attributes);
  }

  @Delete(":id")
  @HttpCode(204)
  async delete(@Param("id", ParseIntPipe) id: number) {
    await this.serverService.delete(id);
  }

  @Serialize(TestConnectionDto)
  @Get("test-connection/:id")
  async testConnection(@Param("id", ParseIntPipe) id: number) {
    return await this.serverService.testConnection(id);
  }
}
