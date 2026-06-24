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

import { backupFiles, FileOps } from './backup';

describe('backupFiles', () => {
  it('为每个文件建目录并复制到备份路径', async () => {
    const calls: { mkdir: string[]; copy: Array<[string, string]> } = {
      mkdir: [],
      copy: [],
    };

    // 假的文件操作器：只记录被要求做什么，不真碰磁盘
    const fakeOps: FileOps = {
      mkdir: async (dir) => { calls.mkdir.push(dir); },
      copyFile: async (src, dest) => { calls.copy.push([src, dest]); },
    };

    await backupFiles(
      '/repo',
      ['.lingma/skills/a.md', '.lingma/skills/sub/b.md'],
      '2026-06-23-01',
      fakeOps
    );

    // 两个文件都被复制
    expect(calls.copy).toEqual([
      [
        '/repo/.lingma/skills/a.md',
        '/repo/.lingma/.backup/2026-06-23-01/.lingma/skills/a.md',
      ],
      [
        '/repo/.lingma/skills/sub/b.md',
        '/repo/.lingma/.backup/2026-06-23-01/.lingma/skills/sub/b.md',
      ],
    ]);

    // 复制前每个文件的目标目录都被建过（recursive）
    expect(calls.mkdir).toContain(
      '/repo/.lingma/.backup/2026-06-23-01/.lingma/skills'
    );
    expect(calls.mkdir).toContain(
      '/repo/.lingma/.backup/2026-06-23-01/.lingma/skills/sub'
    );
  });

  it('空文件列表时不做任何复制', async () => {
    const calls: Array<[string, string]> = [];
    const fakeOps: FileOps = {
      mkdir: async () => {},
      copyFile: async (src, dest) => { calls.push([src, dest]); },
    };

    await backupFiles('/repo', [], '2026-06-23-01', fakeOps);

    expect(calls).toEqual([]);
  });
});