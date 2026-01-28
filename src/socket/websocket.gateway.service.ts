import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from 'src/services/chat/chat.service';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { SendMessageDto } from 'src/dtos/chat.dto';
import { Messages } from 'src/utils/messages/messages';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('ChatGateway');
  private activeUsers: Map<number, string> = new Map(); // userId → socketId

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  // ------------------------------------------------------------
  // 🔹 Gateway Lifecycle
  // ------------------------------------------------------------
  afterInit(): void {
    this.logger.log('✅ Chat Gateway Initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!token) {
        client.disconnect(true);
        return;
      }

      const cleanToken = token.startsWith('Bearer ')
        ? token.substring(7)
        : token;

      const decoded = this.jwtService.verify(cleanToken);
      if (!decoded?.id) {
        client.disconnect(true);
        return;
      }

      this.activeUsers.set(decoded.id, client.id);
      this.logger.log(`🟢 User connected: ${decoded.id}`);

      // Notify others that user is online
      this.server.emit('userStatus', { userId: decoded.id, status: 'online' });
    } catch (error) {
      this.logger.error(`❌ Connection Error: ${error.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = [...this.activeUsers.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (userId) {
      this.activeUsers.delete(userId);
      this.logger.log(`🔴 User disconnected: ${userId}`);
      this.server.emit('userStatus', { userId, status: 'offline' });
    }
  }

  // ------------------------------------------------------------
  // 🔹 Helper: Emit event to a specific user
  // ------------------------------------------------------------
  private emitToUser(userId: number, event: string, data: any): void {
    const socketId = this.activeUsers.get(userId);
    if (socketId) this.server.to(socketId).emit(event, data);
  }

  // ------------------------------------------------------------
  // 🔹 Join and Leave Threads
  // ------------------------------------------------------------
  @SubscribeMessage('joinThread')
  handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: number },
  ): void {
    const { threadId } = data;
    client.join(`thread-${threadId}`);
    this.logger.log(`👥 User joined thread ${threadId}`);
  }

  @SubscribeMessage('leaveThread')
  handleLeaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: number },
  ): void {
    const { threadId } = data;
    client.leave(`thread-${threadId}`);
    this.logger.log(`🚪 User left thread ${threadId}`);
  }

  // ------------------------------------------------------------
  // 💬 Send Message (supports private + group)
  // ------------------------------------------------------------
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ): Promise<void> {
    try {
      const result = await this.chatService.sendMessage(payload);
      if (!result.success) {
        client.emit('errorMessage', { message: result.message });
        return;
      }

      const message = result.payload;
      const threadRoom = `thread-${payload.threadId}`;
      this.logger.log(`📩 Message sent in thread ${payload.threadId}`);

      // Broadcast to thread room (includes group)
      this.server.to(threadRoom).emit('newMessage', message);

      // If it's a direct chat, also push to recipient if online
      // if (payload.recipientId) {
      //   this.emitToUser(payload.recipientId, 'newMessage', message);
      // }

      // Confirmation back to sender
      client.emit('messageDelivered', {
        threadId: payload.threadId,
        messageId: message.id,
      });
    } catch (err) {
      this.logger.error(`❌ sendMessage error: ${err.message}`);
      client.emit('errorMessage', { message: Messages.Exception });
    }
  }

  // ------------------------------------------------------------
  // ✍️ Typing indicator
  // ------------------------------------------------------------
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody()
    data: {
      threadId: number;
      userId: number;
      isTyping: boolean;
    },
  ): void {
    const { threadId, userId, isTyping } = data;
    const threadRoom = `thread-${threadId}`;
    this.server.to(threadRoom).emit('userTyping', { userId, isTyping });
  }

  // ------------------------------------------------------------
  // ✅ Mark as Read (with read receipts)
  // ------------------------------------------------------------
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { threadId: number; userId: number },
  ): Promise<void> {
    try {
      const { threadId, userId } = data;
      await this.chatService.markAsRead(threadId, userId);

      const threadRoom = `thread-${threadId}`;
      this.server.to(threadRoom).emit('readReceipt', { userId, threadId });

      this.logger.log(`✅ Messages marked as read in thread ${threadId}`);
    } catch (err) {
      this.logger.error(`❌ markAsRead error: ${err.message}`);
    }
  }

  // ------------------------------------------------------------
  // 🟢 Online Users
  // ------------------------------------------------------------
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket): void {
    const users = Array.from(this.activeUsers.keys());
    client.emit('onlineUsers', users);
  }

  // ------------------------------------------------------------
  // 🟣 Delivery Acknowledgement (Optional)
  // ------------------------------------------------------------
  @SubscribeMessage('messageDelivered')
  handleMessageDelivered(
    @MessageBody()
    data: {
      threadId: number;
      messageId: number;
      userId: number;
    },
  ) {
    const { threadId, messageId, userId } = data;
    this.server
      .to(`thread-${threadId}`)
      .emit('deliveryReceipt', { userId, messageId });
  }
}
