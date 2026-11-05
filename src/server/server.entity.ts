import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  AfterInsert,
  AfterUpdate,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { LogFile } from '../log_file/log_file.entity.js';

@Entity()
export class Server {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  server_name: string;

  @Column({ unique: true })
  server_ip: string;

  @Column()
  sshKey_path: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => LogFile, (logFile) => logFile.server)
  files: LogFile[];

  @AfterInsert()
  logInsert() {
    console.log('New server added: ' + this.id);
  }

  @AfterUpdate()
  logUpdate() {
    console.log(`Server ${this.id} updated`);
  }
}
