import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatThread } from './chat-thread.schema';
import { StateStatus, MessageContentType, UserRole } from 'src/enums';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  threadId: number;

  @ManyToOne(() => ChatThread, (t) => t.messages, { onDelete: 'CASCADE' })
  thread: ChatThread;

  @Column()
  senderId: number;

  @Column({ nullable: true })
  senderName?: string;

  @Column({ nullable: true })
  senderEmail?: string;

  @Column({ nullable: true })
  senderDp?: string;

  @Column({ default: UserRole.CLIENT })
  senderRole: string;

  @Column({ nullable: true })
  recipientId?: number;

  @Column({ nullable: true })
  recipientName?: string;

  @Column({ nullable: true })
  recipientEmail?: string;

  @Column({ nullable: true })
  recipientDp?: string;

  @Column({
    type: 'enum',
    enum: MessageContentType,
    default: MessageContentType.TEXT,
  })
  contentType: MessageContentType;

  @Column({ nullable: true })
  text?: string;

  @Column({ type: 'json', nullable: true })
  files?: { name: string; url: string; type?: string }[];

  @Column({ type: 'json', nullable: true })
  reply?: { messageId: number; preview?: string };

  @Column({ type: 'enum', enum: StateStatus, default: StateStatus.UNSEEN })
  status: StateStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
