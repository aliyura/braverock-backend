import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'webhooks' })
export class Webhook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reference: string;

  @Column()
  currency: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  channel: string;

  @Column()
  amount: number;

  @Column()
  paidAt: string;

  @Column()
  gatewayResponse: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: 'text' })
  payload: string;

  @Column()
  gateway: string;

  @Column({ nullable: true })
  saleId: string

  @Column()
  userId: number;

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
