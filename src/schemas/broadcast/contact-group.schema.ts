import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user.schema';
import { Contact } from './contact.schema';

@Entity({ name: 'contact-groups' })
export class ContactGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 0 })
  contacts: number;

  @Column('simple-json', { nullable: true })
  recentContacts: Contact[];

  @Column({ nullable: true })
  description?: string;

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
