import {
  BaseStore,
  type GetOperation,
  type Item,
  type ListNamespacesOperation,
  type MatchCondition,
  type Operation,
  type OperationResults,
  type PutOperation,
  type SearchOperation,
} from "@langchain/langgraph";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface PersistedItem {
  key: string;
  namespace: string[];
  value: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type StoreShape = Record<string, PersistedItem>;
type RankedItem = Item & { score?: number };

function namespaceKey(namespace: string[]): string {
  return namespace.join("::");
}

function itemKey(namespace: string[], key: string): string {
  return `${namespaceKey(namespace)}///${key}`;
}

function namespaceStartsWith(namespace: string[], prefix: string[]): boolean {
  if (prefix.length > namespace.length) {
    return false;
  }

  return prefix.every((part, index) => namespace[index] === part);
}

function namespaceEndsWith(namespace: string[], suffix: string[]): boolean {
  if (suffix.length > namespace.length) {
    return false;
  }

  return suffix.every(
    (part, index) => namespace[namespace.length - suffix.length + index] === part,
  );
}

function matchesFilter(
  value: Record<string, unknown>,
  filter?: Record<string, unknown>,
): boolean {
  if (!filter) {
    return true;
  }

  return Object.entries(filter).every(([key, expected]) => {
    const actual = value[key];

    if (
      expected &&
      typeof expected === "object" &&
      !Array.isArray(expected) &&
      !(expected instanceof Date)
    ) {
      const operators = expected as Record<string, unknown>;
      return Object.entries(operators).every(([operator, operatorValue]) => {
        switch (operator) {
          case "$eq":
            return actual === operatorValue;
          case "$ne":
            return actual !== operatorValue;
          case "$gt":
            return Number(actual) > Number(operatorValue);
          case "$gte":
            return Number(actual) >= Number(operatorValue);
          case "$lt":
            return Number(actual) < Number(operatorValue);
          case "$lte":
            return Number(actual) <= Number(operatorValue);
          default:
            return false;
        }
      });
    }

    return actual === expected;
  });
}

function queryScore(value: Record<string, unknown>, query?: string): number {
  if (!query?.trim()) {
    return 0;
  }

  const haystack = JSON.stringify(value).toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function matchesCondition(
  namespace: string[],
  condition: MatchCondition,
  maxDepth?: number,
): boolean {
  const concretePath = condition.path.filter(
    (part): part is string => part !== "*",
  );

  if (condition.matchType === "prefix") {
    if (!namespaceStartsWith(namespace, concretePath)) {
      return false;
    }
  } else if (!namespaceEndsWith(namespace, concretePath)) {
    return false;
  }

  if (typeof maxDepth === "number" && namespace.length > maxDepth) {
    return false;
  }

  return true;
}

export class FileMemoryStore extends BaseStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  async batch<Op extends Operation[]>(operations: Op): Promise<OperationResults<Op>> {
    const store = this.loadStore();
    let dirty = false;
    const results: unknown[] = [];

    for (const operation of operations) {
      if (this.isSearchOperation(operation)) {
        results.push(this.searchItems(store, operation));
        continue;
      }

      if (this.isPutOperation(operation)) {
        this.applyPut(store, operation);
        dirty = true;
        results.push(undefined);
        continue;
      }

      if (this.isListNamespacesOperation(operation)) {
        results.push(this.listNamespacePaths(store, operation));
        continue;
      }

      results.push(this.getItem(store, operation));
    }

    if (dirty) {
      this.saveStore(store);
    }

    return results as OperationResults<Op>;
  }

  private loadStore(): StoreShape {
    if (!existsSync(this.filePath)) {
      return {};
    }

    const raw = readFileSync(this.filePath, "utf8");
    return raw.trim() ? (JSON.parse(raw) as StoreShape) : {};
  }

  private saveStore(store: StoreShape): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(store, null, 2), "utf8");
  }

  private toItem(entry: PersistedItem): Item {
    return {
      key: entry.key,
      namespace: entry.namespace,
      value: entry.value,
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt),
    };
  }

  private getItem(store: StoreShape, operation: GetOperation): Item | null {
    const entry = store[itemKey(operation.namespace, operation.key)];
    return entry ? this.toItem(entry) : null;
  }

  private applyPut(store: StoreShape, operation: PutOperation): void {
    const key = itemKey(operation.namespace, operation.key);
    if (operation.value === null) {
      delete store[key];
      return;
    }

    const existing = store[key];
    const now = new Date().toISOString();

    store[key] = {
      key: operation.key,
      namespace: operation.namespace,
      value: operation.value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  }

  private searchItems(store: StoreShape, operation: SearchOperation): RankedItem[] {
    const offset = operation.offset ?? 0;
    const limit = operation.limit ?? 10;

    const items = Object.values(store)
      .filter((entry) =>
        namespaceStartsWith(entry.namespace, operation.namespacePrefix),
      )
      .filter((entry) => matchesFilter(entry.value, operation.filter))
      .map((entry) => {
        const score = queryScore(entry.value, operation.query);
        return {
          ...this.toItem(entry),
          score,
        };
      })
      .sort((left, right) => {
        if ((operation.query?.trim().length ?? 0) > 0) {
          return (right.score ?? 0) - (left.score ?? 0);
        }

        return right.updatedAt.getTime() - left.updatedAt.getTime();
      })
      .slice(offset, offset + limit);

    return items;
  }

  private listNamespacePaths(
    store: StoreShape,
    operation: ListNamespacesOperation,
  ): string[][] {
    const namespaces = Array.from(
      new Set(Object.values(store).map((entry) => JSON.stringify(entry.namespace))),
    ).map((encoded) => JSON.parse(encoded) as string[]);

    return namespaces
      .filter((namespace) => {
        if (!operation.matchConditions?.length) {
          return true;
        }

        return operation.matchConditions.every((condition) =>
          matchesCondition(namespace, condition, operation.maxDepth),
        );
      })
      .slice(operation.offset, operation.offset + operation.limit);
  }

  private isSearchOperation(operation: Operation): operation is SearchOperation {
    return "namespacePrefix" in operation;
  }

  private isPutOperation(operation: Operation): operation is PutOperation {
    return "value" in operation;
  }

  private isListNamespacesOperation(
    operation: Operation,
  ): operation is ListNamespacesOperation {
    return !("key" in operation) && !("namespace" in operation) && !("namespacePrefix" in operation);
  }
}
