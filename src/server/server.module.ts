import { Module } from "@nestjs/common";
import { ServerController } from "./server.controller.js";
import { ServerService } from "./server.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Server } from "./server.entity.js";
import { SshModule } from "../ssh/ssh.module.js";
import { Message } from "../messages/message.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([Server, Message]), SshModule],
  controllers: [ServerController],
  providers: [ServerService],
  exports: [ServerService],
})
export class ServerModule {}
