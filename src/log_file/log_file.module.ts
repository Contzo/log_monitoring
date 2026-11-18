import { Module } from "@nestjs/common";
import { LogFileService } from "./log_file.service.js";
import { LogFile } from "./log_file.entity.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LogFileController } from "./log_file.controller.js";
import { ServerModule } from "../server/server.module.js";

@Module({
  imports: [TypeOrmModule.forFeature([LogFile]), ServerModule],
  providers: [LogFileService],
  exports: [LogFileService],
  controllers: [LogFileController],
})
export class LogFileModule {}
