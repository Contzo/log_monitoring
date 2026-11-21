import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
  OneToMany,
} from "typeorm";
import { Server } from "../server/server.entity.js";
import { bigintToNumber } from "../common/transformers.js";
import { Message } from "../messages/message.entity.js";

@Entity()
@Index(["server", "logPath"], { unique: true })
export class LogFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  logPath: string;

  @Column({ default: false })
  isEnabled: boolean;

  // ── Read cursor ──────────────────────────
  // Opaque file identity: compared for equality only, never arithmetic.
  @Column({ type: String, nullable: true })
  inode: string | null;

  // Bytes of this file already consumed and stored.
  @Column({ type: "bigint", default: 0, transformer: bigintToNumber })
  byteOffset: number;

  @Column({ type: "bigint", default: 0, transformer: bigintToNumber })
  generation: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Owning server ────────────────────────
  @Column()
  readonly serverId: number;

  @ManyToOne(() => Server, (server) => server.files, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "serverId" })
  server: Relation<Server>;

  @OneToMany(() => Message, (message) => message.logFile)
  messages: Relation<Message[]>;
}
