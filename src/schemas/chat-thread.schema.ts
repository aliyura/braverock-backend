import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatParticipant } from './chat-participant.schema';
import { ChatMessage } from './chat-message.schema';

@Entity('chat_threads')
export class ChatThread {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  isGroup: boolean;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  groupImage?: string;

  @Column({ nullable: true })
  createdById?: number;

  @Column({ nullable: true })
  lastMessage?: string;

  @Column({ nullable: true })
  lastMessageId?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ default: false })
  isPinned: boolean;

  @OneToMany(() => ChatParticipant, (p) => p.thread, { cascade: true })
  participants: ChatParticipant[];

  @OneToMany(() => ChatMessage, (m) => m.thread, { cascade: true })
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
