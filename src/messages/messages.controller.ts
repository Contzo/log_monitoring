import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { MessagesService } from "./messages.service.js";
import { MessagesQueryDTO } from "./dtos/messages-query.dto.js";

@Controller("messages")
export class MessagesController {
  // Add basic getters

  constructor(private readonly messageService: MessagesService) {}
  // ── GET /messages/:id ────────────────────
  @Get(":id")
  findMessage(@Param("id", ParseIntPipe) id: number) {
    return this.messageService.findOne(id);
  }

  // ── GET /messages - get all the messages ─
  @Get()
  find(@Query() query: MessagesQueryDTO) {
    return this.messageService.find(query);
  }
}
