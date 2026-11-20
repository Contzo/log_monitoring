import { Module } from "@nestjs/common";
import { SshService } from "./ssh.service.js";
import { ServerModule } from "../server/server.module.js";

@Module({
  imports: [ServerModule],
  providers: [SshService],
  exports: [SshService],
})
export class SshModule {}
