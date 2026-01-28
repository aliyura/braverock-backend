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
import { ContactGroup } from './contact-group.schema';
import { StateStatus } from 'src/enums';

@Entity({ name: 'contacts' })
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  emailAddress?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  whatsappNumber?: string;

  @Column({ nullable: true })
  whatsappId?: string;

  @Column({ default: StateStatus.ACTIVE })
  status: string;

  @Column({ nullable: true })
  groupId: number;

  @ManyToOne(() => ContactGroup, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: ContactGroup;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

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
