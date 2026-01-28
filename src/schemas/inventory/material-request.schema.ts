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
import { Estate } from '../property/estate.schema';
import { Helpers } from 'src/helpers';

@Entity({ name: 'material_requests' })
export class MaterialRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column()
  estateId: number;

  @ManyToOne(() => Estate)
  @JoinColumn({ name: 'estateId' })
  estate: Estate;

  @Column('text', { nullable: true })
  description: string;

  @Column('simple-json')
  materials: any[];

  @Column({ default: StateStatus.PENDING })
  status: string;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column({ default: Helpers.getCode() })
  code: number;

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  releasedById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'releasedById' })
  releasedBy: User;

  @Column({ nullable: true })
  approverId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approverId' })
  approver: User;

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
