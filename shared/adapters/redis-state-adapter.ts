export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export class RedisStateAdapter {
  constructor(private readonly client: RedisLikeClient, private readonly namespace = "workflow-state") {}

  private key(runId: string): string {
    return `${this.namespace}:${runId}`;
  }

  async load<T>(runId: string): Promise<T | null> {
    const raw = await this.client.get(this.key(runId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async save<T>(runId: string, state: T): Promise<void> {
    await this.client.set(this.key(runId), JSON.stringify(state));
  }

  async remove(runId: string): Promise<void> {
    await this.client.del(this.key(runId));
  }
}

