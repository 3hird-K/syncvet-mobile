import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncEntityType, SyncOperation, SyncOperationStatus, SyncOperationType } from './types';

function queueKey(ownerId: string): string {
  return `syncvet.mutation_queue.${ownerId}`;
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
      return JSON.parse(raw) as SyncOperation[];
    } catch {
      return [];
    }
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
      queue[existingIndex] = {
        ...queue[existingIndex],
        payload,
        updatedAt: now,
      };
    } else {
      queue.push(newOp);
    }

    await this.saveQueue(ownerId, queue);
    return newOp;
  }

  public async getPending(ownerId: string): Promise<SyncOperation[]> {
    const queue = await this.getQueue(ownerId);
    return queue.filter(
      (op) => op.status === 'pending' || (op.status === 'failed' && op.retryCount < op.maxRetries),
    );
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
