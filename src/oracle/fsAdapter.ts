import type { MinimalFsModule } from './types.js';

type FsLike = Pick<typeof import('node:fs/promises'), 'stat' | 'readdir' | 'readFile'>;

export function createFsAdapter(fsModule: FsLike): MinimalFsModule {
  return {
    stat: (targetPath: string) => fsModule.stat(targetPath),
    readdir: (targetPath: string) => fsModule.readdir(targetPath),
    readFile: (targetPath: string, encoding: NodeJS.BufferEncoding) => fsModule.readFile(targetPath, encoding),
  };
}

