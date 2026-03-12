import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface FileLock {
  release(): Promise<void>;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function acquireFileLock(lockPath: string, retries = 20, delayMs = 50): Promise<FileLock> {
  await mkdir(dirname(lockPath), { recursive: true });
  for (let i = 0; i < retries; i += 1) {
    try {
      const handle = await open(lockPath, "wx");
      return {
        async release() {
          await handle.close();
          await rm(lockPath, { force: true });
        },
      };
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      await sleep(delayMs);
    }
  }
  throw new Error("Failed to acquire file lock");
}

export async function writeJsonAtomically(path: string, payload: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
  await rename(tempPath, path);
}

