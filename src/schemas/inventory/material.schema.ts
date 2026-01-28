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
import { StateStatus, SupplyStatus } from 'src/enums';
import { Helpers } from 'src/helpers';
import { Estate } from '../property/estate.schema';

@Entity({ name: 'materials' })
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column('tinytext')
  description: string;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  quantityLeft: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ default: SupplyStatus.PENDING })
  supplyStatus: string;

  @Column({ default: StateStatus.ACTIVE })
  status: string;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column({ default: Helpers.getCode() })
  code: number;

  @Column({ nullable: true })
  estateId: number;

  @ManyToOne(() => Estate, { nullable: true })
  @JoinColumn({ name: 'estateId' })
  estate: Estate;

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  lastSuppliedDate: Date;

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
