import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatThread } from './chat-thread.schema';

@Entity('chat_participants')
export class ChatParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  threadId: number;

  @Column()
  userId: number;

  @Column({ nullable: true })
  userName?: string;

  @Column({ nullable: true })
  userEmail?: string;

  @Column({ nullable: true })
  userDp?: string;

  @Column({ default: 0 })
  unreadCount: number;

  @Column({ nullable: true })
  lastReadAt?: Date;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  isRemoved: boolean;

  @Column({ default: false })
  hasLeft: boolean;

  @ManyToOne(() => ChatThread, (t) => t.participants, { onDelete: 'CASCADE' })
  thread: ChatThread;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
