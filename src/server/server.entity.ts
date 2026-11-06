import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  AfterInsert,
  AfterUpdate,
  CreateDateColumn,
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

  @Column()
  sshKeyPath: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => LogFile, (logFile) => logFile.server)
  files: Relation<LogFile[]>;

  @AfterInsert()
  logInsert() {
    console.log('New server added: ' + this.id);
  }

  @AfterUpdate()
  logUpdate() {
    console.log(`Server ${this.id} updated`);
  }
}
