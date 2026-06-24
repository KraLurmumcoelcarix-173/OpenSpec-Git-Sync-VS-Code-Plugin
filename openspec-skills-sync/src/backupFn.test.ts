import { buildBackupName } from './backupFn';

describe('buildBackupName', () => {
  it('根据今天日期和已有备份算出下一个名字', () => {
    const today = new Date(2026, 5, 23); // 2026-06-23
    const existing = ['2026-06-23-01', '2026-06-22-09'];
    expect(buildBackupName(today, existing)).toBe('2026-06-23-02');
  });

  it('当天无备份时从 01 开始', () => {
    const today = new Date(2026, 5, 23);
    expect(buildBackupName(today, [])).toBe('2026-06-23-01');
  });
});