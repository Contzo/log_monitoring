import { Module } from "@nestjs/common";
import { SshService } from "./ssh.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Server } from "../server/server.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([Server])],
  providers: [SshService],
  exports: [SshService],
})
export class SshModule {}
