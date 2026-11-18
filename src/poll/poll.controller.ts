import { Controller, Patch, Param } from "@nestjs/common";
import { PollManageService } from "./poll-manage.service.js";

@Controller("log-file")
export class PollController {
  constructor(private readonly pollManagerService: PollManageService) {}
  // ── Patch log-file/enable/:id ─────────────
  @Patch("/enable/:id")
  enableLogFileMonitor(@Param("id") id: string) {
    return this.pollManagerService.enableFileMonitoring(parseInt(id));
  }

  // ── Patch log-file/disable/:id ─────────────
  @Patch("/disable/:id")
  disableLogFileMonitor(@Param("id") id: string) {
    return this.pollManagerService.disableFileMonitoring(parseInt(id));
  }
}
