import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  AfterInsert,
  AfterUpdate,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Cursor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  server: string;

  @Column()
  log_path: string;

  @Column()
  inode: number;

  @Column()
  offset: number;

  @CreateDateColumn()
  created_at: Date;

  @AfterInsert()
  logInsert() {
    console.log('New cursor inserted: ' + this.id);
  }

  @AfterUpdate()
  logUpdate() {
    console.log(`Cursor ${this.id} updated to ${this.offset}`);
  }
}
