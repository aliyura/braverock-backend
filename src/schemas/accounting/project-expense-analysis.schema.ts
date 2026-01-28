import { StateStatus } from 'src/enums';
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

@Entity({ name: 'project_expense_analysis' })
export class ProjectExpenseAnalysis {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column('longtext', { nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amountAnalyzed: number;

  // Name of sheet/project e.g. "Cynosure", "Marigold", etc.
  @Column()
  projectName: string;

  /**
   * Dynamic buckets:
   * {
   *  "OFFICE_EQUIPMENTS": 12000,
   *  "SITES_MATERIALS": 5000,
   *  "RAW_MATERIALS": 30000,
   *  "SITE_SECURITIES": 7000
   * }
   */
  @Column('simple-json', { nullable: true })
  buckets: Record<string, number>;

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
