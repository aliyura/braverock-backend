import { SystemType } from 'src/enums';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'configurations' })
export class Configuration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  businessName: string;

  @Column()
  businessEmail: string;

  @Column({ nullable: true })
  businessPhone: string;

  @Column({ nullable: true })
  businessAddress: string;

  @Column({ nullable: true })
  businessWebsite: string;

  @Column({ nullable: true })
  supportEmail: string;

  @Column({ nullable: true })
  supportPhone: string;

  @Column({ type: 'enum', enum: SystemType })
  systemType: SystemType;

  @Column({ type: 'date', nullable: false, unique: true })
  licenseExpiryDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  faviconUrl: string;

  @Column({ nullable: true })
  primaryColor: string;

  @Column({ nullable: true })
  secondaryColor: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
