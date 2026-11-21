import { Module } from "@nestjs/common";
import { PollService } from "./poll.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LogFile } from "../log_file/log_file.entity.js";
import { SshModule } from "../ssh/ssh.module.js";
import { PollController } from "./poll.controller.js";
import { LogFileModule } from "../log_file/log_file.module.js";
import { PollManageService } from "./poll-manage.service.js";
import { RemoteLogReaderService } from "./RemoteLogReader.service.js";
import { MessagesModule } from "../messages/messages.module.js";

@Module({
  imports: [TypeOrmModule.forFeature([LogFile]), SshModule, LogFileModule, MessagesModule],
  providers: [PollService, PollManageService, RemoteLogReaderService],
  controllers: [PollController],
})
export class PollModule {}
