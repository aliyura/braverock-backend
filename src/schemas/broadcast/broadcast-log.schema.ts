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
import { StateStatus } from 'src/enums';
import { Contact } from './contact.schema';
import { Broadcast } from './broadcast.schema';
import { ContactGroup } from './contact-group.schema';

@Entity({ name: 'broadcast-logs' })
export class BroadcastLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  broadcastId: number;

  @ManyToOne(() => Broadcast)
  @JoinColumn({ name: 'broadcastId' })
  broadcast: Broadcast;

  @Column()
  contactId: number;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ nullable: true })
  groupId: number;

  @ManyToOne(() => ContactGroup, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: ContactGroup;

  @Column()
  channel: string;

  @Column({ default: StateStatus.QUEUED })
  status: StateStatus;

  @Column('text', { nullable: true })
  providerResponse?: string;

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
