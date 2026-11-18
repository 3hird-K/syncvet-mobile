import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncEntityType, SyncOperation, SyncOperationStatus, SyncOperationType } from './types';

function queueKey(ownerId: string): string {
  return `syncvet.mutation_queue.${ownerId}`;
}

// An app kill during a sync can leave an operation stuck in `syncing`. Treat it
// as pending again once it is clearly stale so it is not lost forever.
const STALE_SYNCING_MS = 2 * 60 * 1000;
const RETRY_DELAYS_MS = [0, 5_000, 30_000, 120_000];

function timestampMs(value?: string): number {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function retryDelayMs(retryCount: number): number {
  return RETRY_DELAYS_MS[Math.min(Math.max(retryCount, 0), RETRY_DELAYS_MS.length - 1)];
}

export class SyncQueue {
  private static instance: SyncQueue;

  public static getInstance(): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue();
    }
    return SyncQueue.instance;
  }

  public async getQueue(ownerId: string): Promise<SyncOperation[]> {
    if (!ownerId) return [];
    try {
      const raw = await AsyncStorage.getItem(queueKey(ownerId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SyncOperation[];
      return await this.recoverStaleOperations(
        ownerId,
        Array.isArray(parsed) ? parsed : [],
      );
    } catch {
      return [];
    }
  }

  private async recoverStaleOperations(
    ownerId: string,
    queue: SyncOperation[],
  ): Promise<SyncOperation[]> {
    const now = Date.now();
    let changed = false;

    const recovered = queue.map((op) => {
      if (
        op.status === 'syncing' &&
        now - timestampMs(op.updatedAt || op.createdAt) > STALE_SYNCING_MS
      ) {
        changed = true;
        return {
          ...op,
          status: 'pending' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return op;
    });

    if (changed) await this.saveQueue(ownerId, recovered);
    return recovered;
  }

  private async saveQueue(ownerId: string, queue: SyncOperation[]): Promise<void> {
    if (!ownerId) return;
    await AsyncStorage.setItem(queueKey(ownerId), JSON.stringify(queue));
  }

  public async enqueue<T>(
    ownerId: string,
    entity: SyncEntityType,
    entityId: string,
    operation: SyncOperationType,
    payload: T,
    idempotencyKey?: string,
  ): Promise<SyncOperation<T>> {
    const queue = await this.getQueue(ownerId);
    const now = new Date().toISOString();

    const newOp: SyncOperation<T> = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ownerId,
      entity,
      entityId,
      operation,
      payload,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      idempotencyKey: idempotencyKey || `${entity}_${entityId}_${operation}_${Date.now()}`,
    };

    // If an existing pending update/mutation exists for the same entity and operation type,
    // consolidate where appropriate (e.g. repeated edits to the same pet before sync)
    const existingIndex = queue.findIndex(
      (op) =>
        op.status === 'pending' &&
        op.entity === entity &&
        op.entityId === entityId &&
        op.operation === operation,
    );

    if (existingIndex >= 0 && operation !== 'BOOK_APPOINTMENT') {
      // Shallow-merge so a later small profile edit does not erase fields from
      // an earlier onboarding payload waiting in the same pending operation.
      queue[existingIndex] = {
        ...queue[existingIndex],
        payload: { ...(queue[existingIndex].payload || {}), ...payload },
        updatedAt: now,
        status: 'pending',
        lastError: undefined,
      };
    } else {
      queue.push(newOp);
    }

    await this.saveQueue(ownerId, queue);
    return newOp;
  }

  public async getPending(ownerId: string): Promise<SyncOperation[]> {
    const queue = await this.getQueue(ownerId);
    const now = Date.now();
    return queue.filter(
      (op) =>
        op.status === 'pending' ||
        (op.status === 'failed' &&
          op.retryCount < op.maxRetries &&
          now - timestampMs(op.updatedAt || op.createdAt) >= retryDelayMs(op.retryCount)),
    );
  }

  /** Returns the shortest remaining backoff among retryable failures. */
  public async getNextRetryDelay(ownerId: string): Promise<number | null> {
    const queue = await this.getQueue(ownerId);
    const now = Date.now();
    const delays = queue
      .filter((op) => op.status === 'failed' && op.retryCount < op.maxRetries)
      .map((op) =>
        Math.max(
          0,
          timestampMs(op.updatedAt || op.createdAt) + retryDelayMs(op.retryCount) - now,
        ),
      );

    return delays.length ? Math.min(...delays) : null;
  }

  public async getPendingCount(ownerId: string): Promise<number> {
    const pending = await this.getPending(ownerId);
    return pending.length;
  }

  public async markStatus(
    ownerId: string,
    operationId: string,
    status: SyncOperationStatus,
    error?: string,
  ): Promise<void> {
    const queue = await this.getQueue(ownerId);
    const index = queue.findIndex((op) => op.id === operationId);
    if (index === -1) return;

    const op = queue[index];
    const retryCount = status === 'failed' ? op.retryCount + 1 : op.retryCount;

    queue[index] = {
      ...op,
      status,
      retryCount,
      lastError: error,
      updatedAt: new Date().toISOString(),
    };

    await this.saveQueue(ownerId, queue);
  }

  public async remove(ownerId: string, operationId: string): Promise<void> {
    const queue = await this.getQueue(ownerId);
    const updated = queue.filter((op) => op.id !== operationId);
    await this.saveQueue(ownerId, updated);
  }

  public async clear(ownerId: string): Promise<void> {
    await AsyncStorage.removeItem(queueKey(ownerId));
  }
}

export const syncQueue = SyncQueue.getInstance();
