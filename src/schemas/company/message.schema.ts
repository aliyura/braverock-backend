import { StateStatus } from 'src/enums';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  emailAddress: string;

  @Column()
  subject: string;

  @Column({ nullable: true })
  address: string;

  @Column('text')
  message: string;

  @Column({ default: StateStatus.PENDING })
  status: string;

  @Column('simple-json', { nullable: true })
  replies: any[];

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  insertCreated() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  insertUpdated() {
    this.updatedAt = new Date();
  }
}
