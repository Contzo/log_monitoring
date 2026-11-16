import { Module } from "@nestjs/common";
import { PollService } from "./poll.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LogFile } from "../log_file/log_file.entity.js";
import { SshModule } from "../ssh/ssh.module.js";

@Module({
  imports: [TypeOrmModule.forFeature([LogFile]), SshModule],
  providers: [PollService],
  exports: [PollService],
})
export class PollModule {}
