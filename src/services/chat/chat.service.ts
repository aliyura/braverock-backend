import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as NodeCache from 'node-cache';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';

import { ChatThread } from 'src/schemas/chat-thread.schema';
import { ChatParticipant } from 'src/schemas/chat-participant.schema';
import { ChatMessage } from 'src/schemas/chat-message.schema';
import { User } from 'src/schemas/user.schema';

import {
  CreateThreadDto,
  SendMessageDto,
  ForwardMessageDto,
  CreateGroupDto,
  UpdateGroupDto,
  GroupMemberActionDto,
} from 'src/dtos/chat.dto';

import { MessageContentType, StateStatus } from 'src/enums';

@Injectable()
export class ChatService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(ChatThread)
    private readonly threadRepo: Repository<ChatThread>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepo: Repository<ChatParticipant>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ----------------------------------------------------------------
  // THREADS
  // ----------------------------------------------------------------

  async getUserThreads(
    userId: number,
    page = 0,
    size = 20,
  ): Promise<ApiResponse> {
    try {
      const [threads, total] = await this.threadRepo.findAndCount({
        relations: ['participants', 'messages'],
        where: {
          participants: { userId },
        },
        order: { lastMessageAt: 'DESC' },
        take: size,
        skip: page * size,
      });

      if (!threads.length) return Response.failure(Messages.NoRecordFound);

      return Response.success({
        page: threads,
        currentPage: page,
        totalPages: Math.ceil(total / size),
        size,
      });
    } catch (ex) {
      console.log('Error fetching threads', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async createThread(requestDto: CreateThreadDto): Promise<ApiResponse> {
    try {
      const { userAId, userBId } = requestDto;

      const existing = await this.threadRepo
        .createQueryBuilder('t')
        .innerJoin('t.participants', 'a', 'a.userId = :aId', { aId: userAId })
        .innerJoin('t.participants', 'b', 'b.userId = :bId', { bId: userBId })
        .where('t.isGroup = false')
        .getOne();

      if (existing) return Response.success(existing);

      const thread = await this.threadRepo.save({ isGroup: false });

      await this.participantRepo.save([
        this.participantRepo.create({ threadId: thread.id, userId: userAId }),
        this.participantRepo.create({ threadId: thread.id, userId: userBId }),
      ]);

      return Response.success(thread);
    } catch (ex) {
      console.log('Error creating thread', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteThread(threadId: number): Promise<ApiResponse> {
    try {
      await this.threadRepo.delete(threadId);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log('Error deleting thread', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async togglePin(threadId: number): Promise<ApiResponse> {
    try {
      const thread = await this.threadRepo.findOne({ where: { id: threadId } });
      if (!thread) return Response.failure(Messages.RecordNotFound);

      await this.threadRepo.update(threadId, { isPinned: !thread.isPinned });
      return Response.success(
        !thread.isPinned ? Messages.PinnedSuccessfully : Messages.Unpinned,
      );
    } catch (ex) {
      console.log('Error pinning thread', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ----------------------------------------------------------------
  // MESSAGES
  // ----------------------------------------------------------------

  async getThreadMessages(
    userId: number,
    threadId: number,
    page = 0,
    size = 20,
  ): Promise<ApiResponse> {
    try {
      const participant = await this.participantRepo.findOne({
        where: { userId, threadId },
      });
      if (!participant) return Response.failure(Messages.NoPermission);

      const [messages, total] = await this.messageRepo.findAndCount({
        where: { threadId },
        order: { createdAt: 'DESC' },
        take: size,
        skip: page * size,
      });

      if (!messages.length) return Response.failure(Messages.NoRecordFound);

      return Response.success({
        page: messages.reverse(),
        currentPage: page,
        totalPages: Math.ceil(total / size),
        size,
      });
    } catch (ex) {
      console.log('Error fetching thread messages', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async sendMessage(payload: SendMessageDto): Promise<ApiResponse> {
    try {
      return Response.success('Message snet');
    } catch (ex) {
      console.log('Error sending message via socket', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async forwardMessage(requestDto: ForwardMessageDto): Promise<ApiResponse> {
    try {
      const { messageId, recipientId } = requestDto;
      const msg = await this.messageRepo.findOne({ where: { id: messageId } });
      if (!msg) return Response.failure(Messages.RecordNotFound);

      // Check if thread exists
      const existing = await this.threadRepo
        .createQueryBuilder('t')
        .innerJoin('t.participants', 'a', 'a.userId = :aId', {
          aId: msg.senderId,
        })
        .innerJoin('t.participants', 'b', 'b.userId = :bId', {
          bId: recipientId,
        })
        .where('t.isGroup = false')
        .getOne();

      const thread =
        existing ||
        (await this.threadRepo.save(
          this.threadRepo.create({ isGroup: false }),
        ));

      if (!existing) {
        await this.participantRepo.save([
          this.participantRepo.create({
            threadId: thread.id,
            userId: msg.senderId,
          }),
          this.participantRepo.create({
            threadId: thread.id,
            userId: recipientId,
          }),
        ]);
      }

      const forwarded = await this.messageRepo.save(
        this.messageRepo.create({
          threadId: thread.id,
          senderId: msg.senderId,
          recipientId,
          text: msg.text,
          files: msg.files,
          contentType: msg.contentType,
          status: StateStatus.UNSEEN,
        }),
      );

      await this.threadRepo.update(thread.id, {
        lastMessage: msg.text,
        lastMessageId: forwarded.id,
        lastMessageAt: forwarded.createdAt,
      });

      return Response.success(forwarded);
    } catch (ex) {
      console.log('Error forwarding message', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async markAsRead(threadId: number, userId: number): Promise<ApiResponse> {
    try {
      await this.participantRepo.update(
        { threadId, userId },
        { unreadCount: 0, lastReadAt: new Date() },
      );

      await this.messageRepo
        .createQueryBuilder()
        .update(ChatMessage)
        .set({ status: StateStatus.SEEN })
        .where('threadId = :threadId AND recipientId = :userId', {
          threadId,
          userId,
        })
        .execute();

      return Response.success(Messages.MarkedAsRead);
    } catch (ex) {
      console.log('Error marking as read', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ----------------------------------------------------------------
  // GROUPS
  // ----------------------------------------------------------------

  async createGroup(
    creatorId: number,
    requestDto: CreateGroupDto,
  ): Promise<ApiResponse> {
    try {
      const { name, participantIds } = requestDto;
      const thread = await this.threadRepo.save(
        this.threadRepo.create({
          isGroup: true,
          title: name,
          createdById: creatorId,
        }),
      );

      const memberIds = Array.from(new Set([creatorId, ...participantIds]));
      const members = await this.userRepo.findBy({ id: In(memberIds) });

      const participants = members.map((u) =>
        this.participantRepo.create({
          threadId: thread.id,
          userId: u.id,
          isAdmin: u.id === creatorId,
        }),
      );

      await this.participantRepo.save(participants);
      return Response.success(thread);
    } catch (ex) {
      console.log('Error creating group', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateGroup(
    groupId: number,
    requestDto: UpdateGroupDto,
  ): Promise<ApiResponse> {
    try {
      await this.threadRepo.update(groupId, { title: requestDto.name });
      return Response.success(Messages.Updated);
    } catch (ex) {
      console.log('Error updating group', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async addMembers(
    groupId: number,
    requestDto: GroupMemberActionDto,
  ): Promise<ApiResponse> {
    try {
      const existing = await this.participantRepo.findBy({
        threadId: groupId,
        userId: In(requestDto.memberIds),
      });
      const existingIds = new Set(existing.map((e) => e.userId));
      const toAddIds = requestDto.memberIds.filter(
        (id) => !existingIds.has(id),
      );

      if (!toAddIds.length) return Response.success(Messages.AddedSuccessfully);

      const users = await this.userRepo.findBy({ id: In(toAddIds) });
      const participants = users.map((u) =>
        this.participantRepo.create({
          threadId: groupId,
          userId: u.id,
          isAdmin: false,
        }),
      );
      await this.participantRepo.save(participants);

      return Response.success(Messages.AddedSuccessfully);
    } catch (ex) {
      console.log('Error adding group members', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async removeMember(groupId: number, memberId: number): Promise<ApiResponse> {
    try {
      await this.participantRepo.update(
        { threadId: groupId, userId: memberId },
        { isRemoved: true },
      );
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log('Error removing member', ex);
      return Response.failure(Messages.Exception);
    }
  }

  async leaveGroup(groupId: number, userId: number): Promise<ApiResponse> {
    try {
      await this.participantRepo.update(
        { threadId: groupId, userId },
        { hasLeft: true },
      );
      return Response.success(Messages.LeftGroup);
    } catch (ex) {
      console.log('Error leaving group', ex);
      return Response.failure(Messages.Exception);
    }
  }
}
