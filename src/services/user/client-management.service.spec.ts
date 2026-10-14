import { UserService } from './user.service';
import { UserRole, StateStatus, AuthProvider, ActionType } from 'src/enums';
import { Messages } from 'src/utils/messages/messages';
import { User } from 'src/schemas/user.schema';
import { Account } from 'src/schemas/accounting/account.schema';

describe('UserService - Client Management (updateClient & deleteClient)', () => {
  let service: UserService;
  let userRepo: any;
  let accountRepo: any;
  let employeeRepo: any;
  let jwtService: any;
  let cryptoService: any;
  let queueProducerService: any;
  let chatService: any;

  const mockAdmin: User = {
    id: 1,
    name: 'Admin Boss',
    role: UserRole.ADMIN,
    emailAddress: 'admin@braverock.com',
    phoneNumber: '08011111111',
  } as any;

  const mockAgent: User = {
    id: 2,
    name: 'Agent Smith',
    role: UserRole.AGENT,
    emailAddress: 'agent@braverock.com',
    phoneNumber: '08022222222',
  } as any;

  const mockOtherAgent: User = {
    id: 99,
    name: 'Other Agent',
    role: UserRole.AGENT,
    emailAddress: 'otheragent@braverock.com',
    phoneNumber: '08099999999',
  } as any;

  const mockClient: User = {
    id: 10,
    name: 'Jane Doe',
    role: UserRole.CLIENT,
    emailAddress: 'jane@example.com',
    phoneNumber: '08033333333',
    status: StateStatus.ACTIVE,
    referredById: 2,
    createdById: 2,
    authProvider: AuthProvider.INTERNAL,
    password: 'hashed-password-123',
    accountId: 20,
    updateHistory: [],
  } as any;

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };
    accountRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ id: 20, ...entity })),
    };
    employeeRepo = {
      findOne: jest.fn(),
    };
    jwtService = {};
    cryptoService = {
      encrypt: jest.fn((pwd) => Promise.resolve(`encrypted_${pwd}`)),
    };
    queueProducerService = {};
    chatService = {};

    service = new UserService(
      userRepo,
      accountRepo,
      employeeRepo,
      jwtService,
      cryptoService,
      queueProducerService,
      chatService,
    );
  });

  describe('updateClient', () => {
    it('should fail if clientId is invalid', async () => {
      const res = await service.updateClient(mockAdmin, NaN, {});
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.ClientNotFound);
    });

    it('should fail if client does not exist or is not a client', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const res = await service.updateClient(mockAdmin, 10, { name: 'New Name' });
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.ClientNotFound);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 10, role: UserRole.CLIENT },
      });
    });

    it('should fail if client is already deleted', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockClient,
        status: StateStatus.DELETED,
      });
      const res = await service.updateClient(mockAdmin, 10, { name: 'New Name' });
      expect(res.success).toBe(false);
      expect(res.message).toBe('Client has already been deleted');
    });

    it('should fail with NoPermission if caller is an unrelated agent', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockClient });
      const res = await service.updateClient(mockOtherAgent, 10, { name: 'New Name' });
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.NoPermission);
    });

    it('should fail if updated email is already taken by another user', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ ...mockClient }) // find client
        .mockResolvedValueOnce({ id: 50, emailAddress: 'taken@example.com' }); // check existing email

      const res = await service.updateClient(mockAdmin, 10, {
        emailAddress: 'taken@example.com',
      });
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.UserWithEmailAlreadyExist);
    });

    it('should fail if updated phone number is already taken by another user', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ ...mockClient }) // find client
        .mockResolvedValueOnce({ id: 50, phoneNumber: '08044444444' }); // check existing phone

      const res = await service.updateClient(mockAdmin, 10, {
        phoneNumber: '08044444444',
      });
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.UserWithPhoneAlreadyExist);
    });

    it('should update client, encrypt password, update account, and add updateHistory when valid', async () => {
      const clientInDb = { ...mockClient };
      userRepo.findOne
        .mockResolvedValueOnce(clientInDb) // find client
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({
          ...clientInDb,
          name: 'Jane Updated',
          account: { bankName: 'GTBank', accountNumber: '0123456789' },
        }); // final fetch with relations

      accountRepo.findOne.mockResolvedValue({
        id: 20,
        userId: 10,
        bankName: 'Old Bank',
      });

      const res = await service.updateClient(mockAdmin, 10, {
        name: 'Jane Updated',
        password: 'newSecretPassword',
        bankName: 'GTBank',
        accountNumber: '0123456789',
        accountName: 'Jane Updated Doe',
      });

      expect(res.success).toBe(true);
      expect(cryptoService.encrypt).toHaveBeenCalledWith('newSecretPassword');
      expect(accountRepo.save).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();

      const savedUserArg = userRepo.save.mock.calls[0][0];
      expect(savedUserArg.name).toBe('Jane Updated');
      expect(savedUserArg.password).toBe('encrypted_newSecretPassword');
      expect(savedUserArg.role).toBe(UserRole.CLIENT);
      expect(savedUserArg.updateHistory.length).toBe(1);
      expect(savedUserArg.updateHistory[0].actionType).toBe(ActionType.UPDATE);
      expect(savedUserArg.updateHistory[0].actionBy).toBe(mockAdmin.id);
    });

    it('should allow referring agent to update client but strip status and referredById changes', async () => {
      const clientInDb = { ...mockClient };
      userRepo.findOne
        .mockResolvedValueOnce(clientInDb)
        .mockResolvedValueOnce(clientInDb);

      const res = await service.updateClient(mockAgent, 10, {
        residentialCity: 'Abuja',
        status: StateStatus.SUSPENDED, // Agent should NOT be able to change status
        referredById: 99, // Agent should NOT be able to steal referral
      });

      expect(res.success).toBe(true);
      const savedUserArg = userRepo.save.mock.calls[0][0];
      expect(savedUserArg.residentialCity).toBe('Abuja');
      expect(savedUserArg.status).toBe(StateStatus.ACTIVE); // Untouched
      expect(savedUserArg.referredById).toBe(2); // Untouched
    });
  });

  describe('deleteClient', () => {
    it('should fail if clientId is invalid', async () => {
      const res = await service.deleteClient(mockAdmin, NaN);
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.ClientNotFound);
    });

    it('should fail with NoPermission if caller is not management', async () => {
      const res = await service.deleteClient(mockAgent, 10);
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.NoPermission);
    });

    it('should fail if client does not exist or is not role CLIENT', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const res = await service.deleteClient(mockAdmin, 999);
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.ClientNotFound);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 999, role: UserRole.CLIENT },
      });
    });

    it('should fail if client is already deleted', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockClient,
        status: StateStatus.DELETED,
      });
      const res = await service.deleteClient(mockAdmin, 10);
      expect(res.success).toBe(false);
      expect(res.message).toBe('Client has already been deleted');
    });

    it('should soft delete client, scramble unique fields, nullify token, and record history', async () => {
      const clientInDb = { ...mockClient, updateHistory: [], notificationToken: 'token123' };
      userRepo.findOne.mockResolvedValue(clientInDb);

      const res = await service.deleteClient(mockAdmin, 10);

      expect(res.success).toBe(true);
      expect(res.payload).toBe('Client deleted successfully');
      expect(res.message).toBe(Messages.RequestSuccessful);
      expect(userRepo.save).toHaveBeenCalled();

      const savedClient = userRepo.save.mock.calls[0][0];
      expect(savedClient.status).toBe(StateStatus.DELETED);
      expect(savedClient.emailAddress).toContain('jane@example.com_deleted');
      expect(savedClient.phoneNumber).toContain('08033333333_deleted');
      expect(savedClient.notificationToken).toBeNull();
      expect(savedClient.updateHistory.length).toBe(1);
      expect(savedClient.updateHistory[0].actionType).toBe(ActionType.DELETE);
      expect(savedClient.updateHistory[0].actionBy).toBe(mockAdmin.id);
    });
  });
});
