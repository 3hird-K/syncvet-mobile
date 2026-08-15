import type { Pet, Appointment } from '@services/data';
import type { NotificationPreferences, ReminderPayload } from './types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './types';
import { notificationService } from './NotificationService';
import { SERVICES, slotToHour } from '@lib/services';
import { formatWeekdayDate } from '@lib/format';

/**
 * Parses appointment dateISO (YYYY-MM-DD) and timeSlot (e.g. "9:30 AM") into a valid local Date object.
 */
function parseAppointmentDateTime(dateISO: string, timeSlot?: string): Date {
  const parts = dateISO.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const slotHourDecimal = timeSlot ? slotToHour(timeSlot) : 9.0;
  const hours = Math.floor(slotHourDecimal);
  const minutes = Math.round((slotHourDecimal - hours) * 60);

  return new Date(year, month, day, hours, minutes, 0, 0);
}

/**
 * Parses vaccine date (YYYY-MM-DD) into a Date object at 9:00 AM local time.
 */
function parseDateAt9AM(dateISO: string): Date {
  const parts = dateISO.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 9, 0, 0, 0);
}

export class ReminderEngine {
  private static instance: ReminderEngine;

  public static getInstance(): ReminderEngine {
    if (!ReminderEngine.instance) {
      ReminderEngine.instance = new ReminderEngine();
    }
    return ReminderEngine.instance;
  }

  /**
   * Generates all active reminders for a resident's pets and appointments.
   */
  public generateTargetReminders(
    pets: Pet[],
    appointments: Appointment[],
    preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
    ownerId = 'resident',
  ): ReminderPayload[] {
    const reminders: ReminderPayload[] = [];
    const now = Date.now();

    // 1. Appointment Reminders
    if (preferences.appointmentsEnabled) {
      for (const appt of appointments) {
        // Only active/upcoming appointments
        if (appt.status === 'cancelled' || appt.status === 'completed') {
          continue;
        }

        const apptDate = parseAppointmentDateTime(appt.date, appt.timeSlot);
        const apptTimeMs = apptDate.getTime();
        const petName = appt.petName || 'Your pet';
        const serviceDef = SERVICES.find((s) => s.id === appt.serviceId);
        const serviceName = serviceDef?.name || 'Veterinary Visit';
        const timeFormatted = appt.timeSlot ? ` at ${appt.timeSlot}` : '';
        const dayFormatted = formatWeekdayDate(appt.date);

        // A. 1 Day Before Reminder (at 9:00 AM day before)
        if (preferences.appointment1DayBefore) {
          const oneDayBefore = new Date(apptTimeMs - 24 * 60 * 60 * 1000);
          oneDayBefore.setHours(9, 0, 0, 0);

          if (oneDayBefore.getTime() > now + 5000 && oneDayBefore.getTime() < apptTimeMs) {
            reminders.push({
              id: `rem_appt_${appt.id}_1d`,
              userId: ownerId,
              petId: appt.petId,
              petName,
              type: 'appointment_day_before',
              title: `${petName}'s Appointment Tomorrow`,
              body: `${petName} has a scheduled ${serviceName} tomorrow (${dayFormatted})${timeFormatted} at City Veterinary Office.`,
              scheduledAt: oneDayBefore.toISOString(),
              channelId: 'appointments',
              sourceEntity: 'appointment',
              sourceEntityId: appt.id,
              enabled: true,
              data: {
                pathname: '/appointments',
                params: { id: appt.id, petId: appt.petId },
                type: 'appointment_day_before',
                petId: appt.petId,
                sourceId: appt.id,
              },
            });
          }
        }

        // B. 2 Hours Before Reminder
        if (preferences.appointmentSameDay2Hours) {
          const twoHoursBefore = new Date(apptTimeMs - 2 * 60 * 60 * 1000);

          if (twoHoursBefore.getTime() > now + 5000) {
            reminders.push({
              id: `rem_appt_${appt.id}_2h`,
              userId: ownerId,
              petId: appt.petId,
              petName,
              type: 'appointment_same_day',
              title: `${petName}'s Appointment in 2 Hours`,
              body: `Reminder: ${petName}'s ${serviceName} starts${timeFormatted} today at City Veterinary Office.`,
              scheduledAt: twoHoursBefore.toISOString(),
              channelId: 'appointments',
              sourceEntity: 'appointment',
              sourceEntityId: appt.id,
              enabled: true,
              data: {
                pathname: '/appointments',
                params: { id: appt.id, petId: appt.petId },
                type: 'appointment_same_day',
                petId: appt.petId,
                sourceId: appt.id,
              },
            });
          }
        }
      }
    }

    // 2. Pet Vaccination Due Date Reminders
    if (preferences.vaccinesEnabled) {
      for (const pet of pets) {
        if (!pet.nextVaccinationDate) continue;

        const vaxDate = parseDateAt9AM(pet.nextVaccinationDate);
        const vaxTimeMs = vaxDate.getTime();
        const dateFormatted = formatWeekdayDate(pet.nextVaccinationDate);

        // A. 7 Days Before Due Date
        if (preferences.vaccine7DaysBefore) {
          const sevenDaysBefore = new Date(vaxTimeMs - 7 * 24 * 60 * 60 * 1000);
          sevenDaysBefore.setHours(9, 0, 0, 0);

          if (sevenDaysBefore.getTime() > now + 5000) {
            reminders.push({
              id: `rem_vax_${pet.id}_7d`,
              userId: ownerId,
              petId: pet.id,
              petName: pet.name,
              type: 'vaccination_due_week',
              title: `${pet.name}'s Vaccination Due in 1 Week`,
              body: `${pet.name}'s anti-rabies vaccine/booster is due on ${dateFormatted}. Book a slot at City Vet.`,
              scheduledAt: sevenDaysBefore.toISOString(),
              channelId: 'pet-health',
              sourceEntity: 'pet',
              sourceEntityId: pet.id,
              enabled: true,
              data: {
                pathname: `/pets/${pet.id}`,
                params: { id: pet.id },
                type: 'vaccination_due_week',
                petId: pet.id,
                sourceId: pet.id,
              },
            });
          }
        }

        // B. 1 Day Before Due Date
        if (preferences.vaccine1DayBefore) {
          const oneDayBefore = new Date(vaxTimeMs - 24 * 60 * 60 * 1000);
          oneDayBefore.setHours(9, 0, 0, 0);

          if (oneDayBefore.getTime() > now + 5000) {
            reminders.push({
              id: `rem_vax_${pet.id}_1d`,
              userId: ownerId,
              petId: pet.id,
              petName: pet.name,
              type: 'vaccination_due_day',
              title: `${pet.name}'s Vaccination Due Tomorrow`,
              body: `Official anti-rabies vaccine is due tomorrow for ${pet.name}. Keep your pet's passport up to date.`,
              scheduledAt: oneDayBefore.toISOString(),
              channelId: 'pet-health',
              sourceEntity: 'pet',
              sourceEntityId: pet.id,
              enabled: true,
              data: {
                pathname: `/pets/${pet.id}`,
                params: { id: pet.id },
                type: 'vaccination_due_day',
                petId: pet.id,
                sourceId: pet.id,
              },
            });
          }
        }
      }
    }

    return reminders;
  }

  /**
   * Idempotently reconciles scheduled OS notifications against current target reminders.
   * Cancels obsolete notifications and schedules missing ones without duplicate spam.
   */
  public async reconcile(
    pets: Pet[],
    appointments: Appointment[],
    preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
    ownerId = 'resident',
  ): Promise<{ scheduled: number; cancelled: number; kept: number }> {
    try {
      const targetReminders = this.generateTargetReminders(pets, appointments, preferences, ownerId);
      const targetMap = new Map<string, ReminderPayload>();
      for (const r of targetReminders) {
        targetMap.set(r.id, r);
      }

      // Fetch all currently scheduled OS notifications
      const scheduledNotifications = await notificationService.getAllScheduled();
      const existingSyncVetNotifs = scheduledNotifications.filter((n) =>
        n.identifier.startsWith('rem_'),
      );

      const existingIds = new Set(existingSyncVetNotifs.map((n) => n.identifier));

      let cancelledCount = 0;
      let scheduledCount = 0;
      let keptCount = 0;

      // 1. Cancel notifications that are no longer valid (e.g. cancelled appt, deleted pet, changed date)
      for (const notif of existingSyncVetNotifs) {
        if (!targetMap.has(notif.identifier)) {
          await notificationService.cancelReminder(notif.identifier);
          cancelledCount++;
        } else {
          keptCount++;
        }
      }

      // 2. Schedule reminders that are not yet in OS schedule
      for (const [id, reminder] of targetMap.entries()) {
        if (!existingIds.has(id)) {
          const res = await notificationService.scheduleReminder(reminder);
          if (res) {
            scheduledCount++;
          }
        }
      }

      return {
        scheduled: scheduledCount,
        cancelled: cancelledCount,
        kept: keptCount,
      };
    } catch (error) {
      console.log('[ReminderEngine] Reconcile error:', error);
      return { scheduled: 0, cancelled: 0, kept: 0 };
    }
  }
}

export const reminderEngine = ReminderEngine.getInstance();
