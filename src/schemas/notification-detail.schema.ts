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
import { User } from './user.schema';
import { StateStatus } from 'src/enums';

@Entity({ name: 'notifications' })
export class NotificationDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({nullable: true})
  initiatedUserId:number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiatedUserId' })
  initiatedUser: User;

  @Column()
  title: string;

  @Column({nullable: true})
  category: string;

  @Column({ type: 'text', nullable: true })
  body: any;

  @Column({
    default: StateStatus.UNSEEN,
  })
  status: string;

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
