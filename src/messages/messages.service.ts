import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Message } from "./message.entity.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { type ParsedLine } from "../poll/parse-lines.js";
import { MessagesQueryDTO } from "./dtos/messages-query.dto.js";

export interface MessagesEnvelope {
  messages: Message[];
  nextCursor: number | null;
}

@Injectable()
export class MessagesService {
  constructor(@InjectRepository(Message) private readonly messageRepository: Repository<Message>) {}

  /*//////////////////////////////////////////////////////////////
                         Public methods
//////////////////////////////////////////////////////////////*/
  async findOne(id: number) {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException(`Message with id: ${id} not found`);
    return message;
  }

  async find({
    logFileId,
    before,
    limit,
    to,
    from,
    serverId,
  }: MessagesQueryDTO): Promise<MessagesEnvelope> {
    const qb = this.messageRepository.createQueryBuilder("message");

    if (logFileId !== undefined) {
      qb.andWhere("message.logFileId = :logFileId", { logFileId });
    }
    if (before !== undefined) {
      qb.andWhere("message.id < :before", { before });
    }
    if (from !== undefined) {
      if (to !== undefined && from > to)
        throw new BadRequestException("From must be earlier than to");
      qb.andWhere("message.createdAt >= :from", { from });
    }
    if (to !== undefined) {
      qb.andWhere("message.createdAt < :to", { to });
    }
    if (serverId !== undefined) {
      qb.innerJoin("message.logFile", "logFile").andWhere("logFile.serverId = :serverId", {
        serverId,
      });
    }
    const rows = await qb
      .orderBy("message.id", "DESC")
      .limit(limit + 1)
      .getMany();

    const hasMore = rows.length > limit;
    const messages = hasMore ? rows.slice(0, limit) : rows;

    return {
      messages,
      nextCursor: hasMore ? messages[messages.length - 1].id : null,
    };
  }
  async insertBatch(
    logFileId: number,
    generation: number,
    lines: ParsedLine[],
    manager?: EntityManager,
  ): Promise<void> {
    if (lines.length === 0) return;
    const repository = this.repository(manager);
    const messages = lines.map((line): Omit<Message, "id" | "logFile" | "createdAt"> => {
      return { text: line.content, startOffset: line.startOffset, generation, logFileId };
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
