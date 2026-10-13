/**
 * #959 Four ready-made shift templates per branch, created once (AttendanceSetting.templatesSeededAt).
 */
const mockTx = {
  attendanceSetting: { updateMany: jest.fn() },
  shiftTemplate: { count: jest.fn(), createMany: jest.fn() },
};
const mockPrisma = {
  attendanceSetting: { findUnique: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(async (fn: any) => fn(mockTx)),
};
jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));

import { DEFAULT_SHIFT_TEMPLATES, seedDefaultShiftTemplates } from '../../../packages/database/src/shift-schedule';

describe('seedDefaultShiftTemplates (#959)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.attendanceSetting.findUnique.mockResolvedValue(null);
    mockPrisma.attendanceSetting.upsert.mockResolvedValue({ id: 1 });
    mockTx.attendanceSetting.updateMany.mockResolvedValue({ count: 1 });
    mockTx.shiftTemplate.count.mockResolvedValue(0);
    mockTx.shiftTemplate.createMany.mockResolvedValue({ count: 4 });
  });

  it('the four templates: names, hours, break, colours', () => {
    expect(DEFAULT_SHIFT_TEMPLATES).toEqual([
      { name: 'Ca sáng', startTime: '08:00', endTime: '12:00', breakMinutes: 0, color: 'blue' },
      { name: 'Ca chiều', startTime: '13:00', endTime: '17:00', breakMinutes: 0, color: 'orange' },
      { name: 'Ca tối', startTime: '18:00', endTime: '22:00', breakMinutes: 0, color: 'purple' },
      { name: 'Hành chính', startTime: '08:00', endTime: '17:00', breakMinutes: 60, color: 'green' },
    ]);
  });

  it('never seeded and empty → marks and creates the four for that outlet and merchant', async () => {
    expect(await seedDefaultShiftTemplates(5, 2)).toBe(true);
    expect(mockPrisma.attendanceSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { outletId: 5 }, create: { outletId: 5, merchantId: 2 }, update: {} })
    );
    expect(mockTx.attendanceSetting.updateMany).toHaveBeenCalledWith({
      where: { outletId: 5, templatesSeededAt: null },
      data: { templatesSeededAt: expect.any(Date) },
    });
    const rows = mockTx.shiftTemplate.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(4);
    for (const r of rows) expect(r).toMatchObject({ merchantId: 2, outletId: 5 });
  });

  it('already seeded → no write at all', async () => {
    mockPrisma.attendanceSetting.findUnique.mockResolvedValue({ templatesSeededAt: new Date() });
    expect(await seedDefaultShiftTemplates(5, 2)).toBe(false);
    expect(mockPrisma.attendanceSetting.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('outlet already has templates → only the mark, no template', async () => {
    mockPrisma.attendanceSetting.findUnique.mockResolvedValue({ templatesSeededAt: null });
    mockTx.shiftTemplate.count.mockResolvedValue(2);
    expect(await seedDefaultShiftTemplates(5, 2)).toBe(false);
    expect(mockTx.attendanceSetting.updateMany).toHaveBeenCalled();
    expect(mockTx.shiftTemplate.createMany).not.toHaveBeenCalled();
  });

  it('another request claimed the mark first → no template', async () => {
    mockTx.attendanceSetting.updateMany.mockResolvedValue({ count: 0 });
    expect(await seedDefaultShiftTemplates(5, 2)).toBe(false);
    expect(mockTx.shiftTemplate.count).not.toHaveBeenCalled();
    expect(mockTx.shiftTemplate.createMany).not.toHaveBeenCalled();
  });

  it('a parallel insert of the setting row (P2002) is tolerated; other errors are not', async () => {
    mockPrisma.attendanceSetting.upsert.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    expect(await seedDefaultShiftTemplates(5, 2)).toBe(true);
    mockPrisma.attendanceSetting.upsert.mockRejectedValueOnce(new Error('db down'));
    await expect(seedDefaultShiftTemplates(5, 2)).rejects.toThrow('db down');
  });
});
