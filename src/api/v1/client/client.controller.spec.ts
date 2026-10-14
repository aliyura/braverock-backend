import { Test, TestingModule } from '@nestjs/testing';
import { ClientController } from './client.controller';
import { UserService } from 'src/services/user/user.service';
import { HttpStatus, HttpException } from '@nestjs/common';
import { Messages } from 'src/utils/messages/messages';
import { UserRole } from 'src/enums';

describe('ClientController', () => {
  let controller: ClientController;
  let userService: Partial<Record<keyof UserService, jest.Mock>>;

  const mockUser = {
    id: 1,
    name: 'Admin User',
    role: UserRole.ADMIN,
    emailAddress: 'admin@braverock.com',
  } as any;

  beforeEach(async () => {
    userService = {
      authenticatedUserByToken: jest.fn(),
      createClient: jest.fn(),
      updateClient: jest.fn(),
      deleteClient: jest.fn(),
      findClientById: jest.fn(),
      findAllClients: jest.fn(),
      searchClients: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    controller = module.get<ClientController>(ClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateClient', () => {
    it('should throw UNAUTHORIZED when token is invalid', async () => {
      userService.authenticatedUserByToken.mockResolvedValue({
        success: false,
        message: Messages.InvalidAuthToken,
      });

      await expect(
        controller.updateClient({}, 1, 'Bearer invalid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST when clientId is invalid', async () => {
      await expect(
        controller.updateClient({}, NaN as any, 'Bearer valid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw FORBIDDEN when user has no permission', async () => {
      userService.authenticatedUserByToken.mockResolvedValue({
        success: true,
        payload: mockUser,
      });
      userService.updateClient.mockResolvedValue({
        success: false,
        message: Messages.NoPermission,
      });

      await expect(
        controller.updateClient({ name: 'New Name' }, 5, 'Bearer valid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw NOT_FOUND when client is not found', async () => {
      userService.authenticatedUserByToken.mockResolvedValue({
        success: true,
        payload: mockUser,
      });
      userService.updateClient.mockResolvedValue({
        success: false,
        message: Messages.ClientNotFound,
      });

      await expect(
        controller.updateClient({ name: 'New Name' }, 999, 'Bearer valid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should return updated client successfully', async () => {
      userService.authenticatedUserByToken.mockResolvedValue({
        success: true,
        payload: mockUser,
      });
      const updatedClient = {
        id: 5,
        name: 'Updated Client',
        role: UserRole.CLIENT,
      };
      userService.updateClient.mockResolvedValue({
        success: true,
        message: Messages.RequestSuccessful,
        payload: updatedClient,
      });

      const result = await controller.updateClient(
        { name: 'Updated Client' },
        5,
        'Bearer valid-token',
      );
      expect(result.success).toBe(true);
      expect(result.payload).toEqual(updatedClient);
      expect(userService.updateClient).toHaveBeenCalledWith(
        mockUser,
        5,
        { name: 'Updated Client' },
      );
    });
  });

  describe('deleteClient', () => {
    it('should throw UNAUTHORIZED when token is invalid', async () => {
      userService.authenticatedUserByToken.mockResolvedValue({
        success: false,
        message: Messages.InvalidAuthToken,
      });

      await expect(
        controller.deleteClient(1, 'Bearer invalid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST when clientId is invalid', async () => {
      await expect(
        controller.deleteClient(NaN as any, 'Bearer valid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw FORBIDDEN when user has no permission', async () => {
      userService.authenticatedUserByToken.mockResolvedValue({
        success: true,
        payload: { ...mockUser, role: 'STAFF' },
      });
      userService.deleteClient.mockResolvedValue({
        success: false,
        message: Messages.NoPermission,
      });

      await expect(
        controller.deleteClient(5, 'Bearer valid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw NOT_FOUND when client does not exist', async () => {
      userService.authenticatedUserByToken.mockResolvedValue({
        success: true,
        payload: mockUser,
      });
      userService.deleteClient.mockResolvedValue({
        success: false,
        message: Messages.ClientNotFound,
      });

      await expect(
        controller.deleteClient(999, 'Bearer valid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should return success when client is deleted', async () => {
      userService.authenticatedUserByToken.mockResolvedValue({
        success: true,
        payload: mockUser,
      });
      userService.deleteClient.mockResolvedValue({
        success: true,
        message: 'Client deleted successfully',
      });

      const result = await controller.deleteClient(5, 'Bearer valid-token');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Client deleted successfully');
      expect(userService.deleteClient).toHaveBeenCalledWith(mockUser, 5);
    });
  });
});
