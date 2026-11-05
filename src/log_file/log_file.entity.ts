import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  AfterInsert,
  AfterUpdate,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Server } from '../server/server.entity.js';

@Entity()
export class LogFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  log_path: string;

  @Column()
  inode: number;

  @Column()
  offset: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Server, (server) => server.files)
  server: Server;

  @AfterInsert()
  logInsert() {
    console.log('New cursor inserted: ' + this.id);
  }

  @AfterUpdate()
  logUpdate() {
    console.log(`Cursor ${this.id} updated to ${this.offset}`);
  }
}
