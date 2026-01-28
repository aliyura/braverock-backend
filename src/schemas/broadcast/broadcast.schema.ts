import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user.schema';
import { Channel } from 'src/enums';

@Entity({ name: 'broadcasts' })
export class Broadcast {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: Channel })
  channel: Channel;

  @Column({ nullable: true })
  subject: string;

  @Column('longtext')
  message: string;

  @Column('simple-array', { nullable: true })
  attachements: string[];

  @Column('simple-array', { nullable: true })
  contactIds: number[];

  @Column('simple-array', { nullable: true })
  groupIds: number[];

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

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
