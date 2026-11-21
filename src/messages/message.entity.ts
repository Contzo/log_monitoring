import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  type Relation,
  Index,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { LogFile } from "../log_file/log_file.entity.js";
import { bigintToNumber } from "../common/transformers.js";

@Entity()
@Index(["logFile", "generation", "startOffset"], { unique: true })
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  text: string;

  @Column()
  readonly logFileId: number;

  @Column({ type: "bigint", transformer: bigintToNumber })
  startOffset: number;

  @Column({ type: "bigint", default: 0, transformer: bigintToNumber })
  generation: number;

  @JoinColumn({ name: "logFileId" })
  @ManyToOne(() => LogFile, (logFile) => logFile.messages, { nullable: false, onDelete: "CASCADE" })
  logFile: Relation<LogFile>;

  @CreateDateColumn()
  createdAt: Date;
}
