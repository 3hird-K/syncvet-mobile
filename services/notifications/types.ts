export type ReminderType =
  | 'appointment_day_before'
  | 'appointment_same_day'
  | 'vaccination_due_week'
  | 'vaccination_due_day'
  | 'deworming_due'
  | 'sync_pending'
  | 'general';

export type NotificationChannelId = 'appointments' | 'pet-health' | 'system' | 'general';

export interface ReminderPayload {
  id: string;
  userId: string;
  petId?: string;
  petName?: string;
  type: ReminderType;
  title: string;
  body: string;
  scheduledAt: string; // ISO 8601 string
  channelId: NotificationChannelId;
  sourceEntity: 'appointment' | 'pet' | 'sync_queue';
  sourceEntityId: string;
  enabled: boolean;
  data: {
    pathname: string;
    params?: Record<string, string | undefined>;
    type: ReminderType;
    petId?: string;
    sourceId: string;
  };
}

export interface NotificationPreferences {
  appointmentsEnabled: boolean;
  appointment1DayBefore: boolean;
  appointmentSameDay2Hours: boolean;
  vaccinesEnabled: boolean;
  vaccine7DaysBefore: boolean;
  vaccine1DayBefore: boolean;
  syncAlertsEnabled: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  appointmentsEnabled: true,
  appointment1DayBefore: true,
  appointmentSameDay2Hours: true,
  vaccinesEnabled: true,
  vaccine7DaysBefore: true,
  vaccine1DayBefore: true,
  syncAlertsEnabled: true,
  soundEnabled: true,
};
