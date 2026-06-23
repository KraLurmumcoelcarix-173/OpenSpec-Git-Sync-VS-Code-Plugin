import { formatDate, nextBackupName } from './backup';

describe('formatDate', () => {
  it('格式化为 yyyy-MM-dd，月份和日期补零', () => {
    // 2026 年 1 月 5 日
    const d = new Date(2026, 0, 5);
    expect(formatDate(d)).toBe('2026-01-05');
  });

  it('两位数月份日期不变', () => {
    // 2026 年 12 月 23 日
    const d = new Date(2026, 11, 23);
    expect(formatDate(d)).toBe('2026-12-23');
  });
});

describe('nextBackupName', () => {
  it('当天还没有备份时，序号从 01 开始', () => {
    const existing: string[] = [];
    expect(nextBackupName('2026-06-23', existing)).toBe('2026-06-23-01');
  });

  it('当天已有 01，返回 02', () => {
    const existing = ['2026-06-23-01'];
    expect(nextBackupName('2026-06-23', existing)).toBe('2026-06-23-02');
  });

  it('当天已有 01、02，返回 03', () => {
    const existing = ['2026-06-23-01', '2026-06-23-02'];
    expect(nextBackupName('2026-06-23', existing)).toBe('2026-06-23-03');
  });

  it('忽略其它日期的备份，只数当天的', () => {
    const existing = ['2026-06-22-01', '2026-06-22-02', '2026-06-23-01'];
    expect(nextBackupName('2026-06-23', existing)).toBe('2026-06-23-02');
  });

  it('序号超过 9 时正常补零到两位（10）', () => {
    const existing = Array.from({ length: 9 }, (_, i) =>
      `2026-06-23-0${i + 1}`
    );
    // 已有 01..09，下一个是 10
    expect(nextBackupName('2026-06-23', existing)).toBe('2026-06-23-10');
  });
});