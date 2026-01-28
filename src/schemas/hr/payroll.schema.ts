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
import { Employee } from './employee.schema';
import { StateStatus } from 'src/enums';
import { User } from '../user.schema';

@Entity({ name: 'payrolls' })
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column()
  month: string; // e.g. "Nov 2025"

  @Column({ default: 0 })
  baseSalary: number;

  @Column({ default: 0 })
  allowance: number;

  @Column({ default: 0 })
  deduction: number;

  @Column({ default: 0 })
  netPay: number;

  @Column({ nullable: true })
  paymentDate: Date;

  @Column({ nullable: true })
  paymentRef: string;

  @Column({ default: 'PENDING' })
  paymentStatus: string; // PENDING, PAID

  @Column({ nullable: true })
  remarks: string;

  @Column({ default: StateStatus.ACTIVE })
  status: string;

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
