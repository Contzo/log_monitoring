import { Injectable } from "@nestjs/common";
import { Message } from "./message.entity.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { type ParsedLine } from "../poll/parse-lines.js";

@Injectable()
export class MessagesService {
  constructor(@InjectRepository(Message) private readonly messageRepository: Repository<Message>) {}

  /*//////////////////////////////////////////////////////////////
                         Public methods
//////////////////////////////////////////////////////////////*/
  async insertBatch(
    logFileId: number,
    generation: number,
    lines: ParsedLine[],
    manager?: EntityManager,
  ): Promise<void> {
    if (lines.length === 0) return;
    const repository = this.repository(manager);

    const messages = lines.map((line): Omit<Message, "id" | "logFile" | "createdAt"> => {
      return {
        text: line.content,
        startOffset: line.startOffset,
        generation,
        logFileId,
      };
    });

    await repository
      .createQueryBuilder()
      .insert()
      .into(Message)
      .values(messages)
      .orIgnore()
      .execute();
  }

  /*//////////////////////////////////////////////////////////////
                       Private Functions
//////////////////////////////////////////////////////////////*/
  private repository(manager?: EntityManager): Repository<Message> {
    return manager ? manager.getRepository(Message) : this.messageRepository;
  }
}
