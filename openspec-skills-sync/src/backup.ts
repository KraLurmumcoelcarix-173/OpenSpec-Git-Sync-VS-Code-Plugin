// 把 Date 格式化成 yyyy-MM-dd（本地时区）
export function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 给定今天的日期字符串和已存在的备份名列表，算出下一个可用名字
// existing 形如 ['2026-06-23-01', '2026-06-22-05', ...]
export function nextBackupName(dateStr: string, existing: string[]): string {
  // 只看当天的备份，取出它们的序号
  const prefix = `${dateStr}-`;
  const seqs = existing
    .filter(name => name.startsWith(prefix))
    .map(name => Number(name.slice(prefix.length)))
    .filter(n => !Number.isNaN(n));

  const next = seqs.length === 0 ? 1 : Math.max(...seqs) + 1;
  return `${dateStr}-${String(next).padStart(2, '0')}`;
}