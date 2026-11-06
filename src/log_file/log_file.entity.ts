import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  AfterInsert,
  AfterUpdate,
  CreateDateColumn,
  ManyToOne,
  Index,
  type Relation,
} from 'typeorm';
import { Server } from '../server/server.entity.js';

@Entity()
@Index(['server', 'logPath'], { unique: true })
export class LogFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  logPath: string;

  @Column({ default: 1000 })
  inode: number;

  @Column({ default: 0 })
  cursor: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Server, (server) => server.files)
  server: Relation<Server>;
}
