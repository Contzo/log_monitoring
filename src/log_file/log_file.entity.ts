import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  AfterInsert,
  AfterUpdate,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Server } from '../server/server.entity.js';

@Entity()
@Index(['server', 'log_path'], { unique: true })
export class LogFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  logPath: string;

  @Column()
  inode: number;

  @Column()
  offset: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Server, (server) => server.files)
  serverId: Server;

  @AfterInsert()
  logInsert() {
    console.log('New cursor inserted: ' + this.id);
  }

  @AfterUpdate()
  logUpdate() {
    console.log(`Cursor ${this.id} updated to ${this.offset}`);
  }
}
