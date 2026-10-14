import { ExpenseService } from './expense.service';
import { ExpenseTargetType } from 'src/enums';
import { Messages } from 'src/utils/messages/messages';
import { User } from 'src/schemas/user.schema';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let expenseRepo: any;
  let userRepo: any;
  let estateRepo: any;
  let layoutRepo: any;
  let queueProducerService: any;

  const mockUser: User = {
    id: 1,
    name: 'Accountant User',
    role: 'ACCOUNTANT',
    emailAddress: 'accountant@braverock.com',
  } as any;

  const mockEstate = {
    id: 10,
    name: 'Sunrise Valley Estate',
  };

  const mockLayout = {
    id: 20,
    name: 'Phase 1 Commercial Layout',
  };

  beforeEach(() => {
    expenseRepo = {
      save: jest.fn((entity) => Promise.resolve({ id: 100, ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      sum: jest.fn().mockResolvedValue(0),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    estateRepo = {
      findOne: jest.fn(),
    };
    layoutRepo = {
      findOne: jest.fn(),
    };
    queueProducerService = {};

    service = new ExpenseService(
      expenseRepo,
      userRepo,
      estateRepo,
      layoutRepo,
      queueProducerService,
    );
  });

  describe('addExpense', () => {
    it('should fail if receipt image is missing', async () => {
      const res = await service.addExpense(mockUser, {
        title: 'Generator Fuel',
        amount: 25000,
        category: 'Maintenance',
        date: '2026-10-14',
        targetType: ExpenseTargetType.OFFICE,
        officePurpose: 'Fuel for central generator',
        receipt: '', // missing
      } as any);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Expense receipt image is required');
    });

    it('should fail if targetType is ESTATE but estateId is missing', async () => {
      const res = await service.addExpense(mockUser, {
        title: 'Road grading',
        amount: 500000,
        category: 'Site Development',
        date: '2026-10-14',
        targetType: ExpenseTargetType.ESTATE,
        receipt: 'https://storage.braverock.com/receipts/rec-123.jpg',
      } as any);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Please select the estate that this expense belongs to');
    });

    it('should fail if targetType is ESTATE but selected estate does not exist in DB', async () => {
      estateRepo.findOne.mockResolvedValue(null);

      const res = await service.addExpense(mockUser, {
        title: 'Road grading',
        amount: 500000,
        category: 'Site Development',
        date: '2026-10-14',
        targetType: ExpenseTargetType.ESTATE,
        estateId: 999,
        receipt: 'https://storage.braverock.com/receipts/rec-123.jpg',
      } as any);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Selected estate not found');
      expect(estateRepo.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
    });

    it('should succeed for ESTATE expense with valid estate, receipt, and proof images', async () => {
      estateRepo.findOne.mockResolvedValue(mockEstate);
      expenseRepo.findOne.mockResolvedValue({
        id: 100,
        title: 'Road grading',
        amount: 500000,
        category: 'Site Development',
        targetType: ExpenseTargetType.ESTATE,
        estateId: 10,
        estate: mockEstate,
        receipt: 'https://storage.braverock.com/receipts/rec-123.jpg',
        proofImages: ['https://storage.braverock.com/proofs/p1.jpg'],
      });

      const res = await service.addExpense(mockUser, {
        title: 'Road grading',
        amount: 500000,
        category: 'Site Development',
        date: '2026-10-14',
        targetType: ExpenseTargetType.ESTATE,
        estateId: 10,
        receipt: 'https://storage.braverock.com/receipts/rec-123.jpg',
        proofImages: ['https://storage.braverock.com/proofs/p1.jpg'],
      } as any);

      expect(res.success).toBe(true);
      expect(expenseRepo.save).toHaveBeenCalled();
      const saved = expenseRepo.save.mock.calls[0][0];
      expect(saved.estateId).toBe(10);
      expect(saved.layoutId).toBeNull();
      expect(saved.officePurpose).toBeNull();
      expect(saved.receipt).toBe('https://storage.braverock.com/receipts/rec-123.jpg');
    });

    it('should fail if targetType is LAYOUT but layoutId is missing', async () => {
      const res = await service.addExpense(mockUser, {
        title: 'Drainage clearing',
        amount: 150000,
        category: 'Maintenance',
        date: '2026-10-14',
        targetType: ExpenseTargetType.LAYOUT,
        receipt: 'https://storage.braverock.com/receipts/rec-456.jpg',
      } as any);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Please select the layout that this expense belongs to');
    });

    it('should fail if targetType is LAYOUT but selected layout does not exist in DB', async () => {
      layoutRepo.findOne.mockResolvedValue(null);

      const res = await service.addExpense(mockUser, {
        title: 'Drainage clearing',
        amount: 150000,
        category: 'Maintenance',
        date: '2026-10-14',
        targetType: ExpenseTargetType.LAYOUT,
        layoutId: 999,
        receipt: 'https://storage.braverock.com/receipts/rec-456.jpg',
      } as any);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Selected layout not found');
      expect(layoutRepo.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
    });

    it('should succeed for LAYOUT expense with valid layout', async () => {
      layoutRepo.findOne.mockResolvedValue(mockLayout);
      expenseRepo.findOne.mockResolvedValue({
        id: 101,
        title: 'Drainage clearing',
        targetType: ExpenseTargetType.LAYOUT,
        layoutId: 20,
        layout: mockLayout,
      });

      const res = await service.addExpense(mockUser, {
        title: 'Drainage clearing',
        amount: 150000,
        category: 'Maintenance',
        date: '2026-10-14',
        targetType: ExpenseTargetType.LAYOUT,
        layoutId: 20,
        receipt: 'https://storage.braverock.com/receipts/rec-456.jpg',
      } as any);

      expect(res.success).toBe(true);
      const saved = expenseRepo.save.mock.calls[0][0];
      expect(saved.layoutId).toBe(20);
      expect(saved.estateId).toBeNull();
      expect(saved.officePurpose).toBeNull();
    });

    it('should fail for OFFICE expense if what it is for is missing', async () => {
      const res = await service.addExpense(mockUser, {
        title: 'Office Stationery',
        amount: 35000,
        category: 'Office Supplies',
        date: '2026-10-14',
        targetType: ExpenseTargetType.OFFICE,
        receipt: 'https://storage.braverock.com/receipts/rec-789.jpg',
      } as any);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Please specify what this office expense is for');
    });

    it('should succeed for OFFICE expense with user specified officePurpose', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 102,
        title: 'Office Stationery',
        targetType: ExpenseTargetType.OFFICE,
        officePurpose: 'A4 Printing paper and printer ink',
      });

      const res = await service.addExpense(mockUser, {
        title: 'Office Stationery',
        amount: 35000,
        category: 'Office Supplies',
        date: '2026-10-14',
        targetType: ExpenseTargetType.OFFICE,
        officePurpose: 'A4 Printing paper and printer ink',
        receipt: 'https://storage.braverock.com/receipts/rec-789.jpg',
      } as any);

      expect(res.success).toBe(true);
      const saved = expenseRepo.save.mock.calls[0][0];
      expect(saved.targetType).toBe(ExpenseTargetType.OFFICE);
      expect(saved.officePurpose).toBe('A4 Printing paper and printer ink');
      expect(saved.estateId).toBeNull();
      expect(saved.layoutId).toBeNull();
    });
  });

  describe('updateExpense', () => {
    it('should fail if expense not found', async () => {
      expenseRepo.findOne.mockResolvedValue(null);
      const res = await service.updateExpense(999, mockUser, { amount: 50000 });
      expect(res.success).toBe(false);
      expect(res.message).toBe(Messages.ExpenseNotAvailable);
    });

    it('should update expense target to an estate verifying estate exists in DB', async () => {
      expenseRepo.findOne
        .mockResolvedValueOnce({
          id: 100,
          title: 'General Expense',
          targetType: ExpenseTargetType.OFFICE,
          officePurpose: 'Old purpose',
        })
        .mockResolvedValueOnce({
          id: 100,
          title: 'General Expense',
          targetType: ExpenseTargetType.ESTATE,
          estateId: 10,
        });

      estateRepo.findOne.mockResolvedValue(mockEstate);

      const res = await service.updateExpense(100, mockUser, {
        targetType: ExpenseTargetType.ESTATE,
        estateId: 10,
      });

      expect(res.success).toBe(true);
      expect(expenseRepo.save).toHaveBeenCalled();
      const saved = expenseRepo.save.mock.calls[0][0];
      expect(saved.targetType).toBe(ExpenseTargetType.ESTATE);
      expect(saved.estateId).toBe(10);
      expect(saved.officePurpose).toBeNull();
    });
  });

  describe('getExpenseById', () => {
    it('should return expense with relations', async () => {
      expenseRepo.findOne.mockResolvedValue({
        id: 100,
        title: 'Office Cleaning',
        targetType: ExpenseTargetType.OFFICE,
      });

      const res = await service.getExpenseById(100);
      expect(res.success).toBe(true);
      expect(expenseRepo.findOne).toHaveBeenCalledWith({
        where: { id: 100 },
        relations: { createdBy: true, estate: true, layout: true },
      });
    });
  });
});
