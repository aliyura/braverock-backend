import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.schema';

@Entity({ name: 'files' })
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  url: string;

  @Column({ type: 'enum', enum: ['file', 'folder'] })
  type: 'file' | 'folder';

  @Column({ nullable: true })
  mimeType?: string;

  @ManyToOne(() => File, (file) => file.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  parent: File;

  @Column({ nullable: true })
  parentId: number;

  @OneToMany(() => File, (file) => file.parent)
  children: File[];

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
