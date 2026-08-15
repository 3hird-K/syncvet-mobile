export type SyncOperationType =
  | 'CREATE_PET'
  | 'UPDATE_PET'
  | 'DELETE_PET'
  | 'BOOK_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'UPDATE_PROFILE';

export type SyncOperationStatus = 'pending' | 'syncing' | 'completed' | 'failed';

export type SyncEntityType = 'pet' | 'appointment' | 'profile' | 'activity';

export interface SyncOperation<T = any> {
  id: string;
  ownerId: string;
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperationType;
  payload: T;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  maxRetries: number;
  status: SyncOperationStatus;
  lastError?: string;
  idempotencyKey: string;
}

export interface SyncEngineState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  lastError?: string;
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ operationId: string; error: string }>;
}
