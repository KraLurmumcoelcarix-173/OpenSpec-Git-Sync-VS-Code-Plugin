import { mkdir, copyFile } from 'fs/promises';
import type { FileOps } from './backup';

// 生产环境的真实文件操作器
export const realFileOps: FileOps = {
  mkdir: async (dir) => {
    await mkdir(dir, { recursive: true });
  },
  copyFile: async (src, dest) => {
    await copyFile(src, dest);
  },
};