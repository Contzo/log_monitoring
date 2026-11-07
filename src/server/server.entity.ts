import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  type Relation,
} from 'typeorm';
import { LogFile } from '../log_file/log_file.entity.js';

@Entity()
export class Server {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  serverName: string;

  @Column({ unique: true })
  serverIp: string;

  // ── SSH connection ───────────────────────
  @Column()
  sshUser: string;

  @Column({ default: 22 })
  sshPort: number;

  @Column()
  sshKeyPath: string;

  // ── Poller control ───────────────────────
  @Column({ default: true })
  isEnabled: boolean;

  // ── Poller status (written by the poll loop) ──
  @Column({ type: Date, nullable: true })
  lastSuccessAt: Date | null;

  @Column({ type: Date, nullable: true })
  lastErrorAt: Date | null;

  @Column({ type: String, nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => LogFile, (logFile) => logFile.server)
  files: Relation<LogFile[]>;
}
