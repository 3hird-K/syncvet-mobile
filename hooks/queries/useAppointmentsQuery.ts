import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDataService } from '@services/data';
import { queryKeys } from '@lib/queryClient';
import { useDataStore } from '@store/useDataStore';
import type { Appointment, BookingInput } from '@services/data/types';

/**
 * TanStack Query hook to fetch the resident's appointments.
 */
export function useAppointmentsQuery(ownerId: string) {
  return useQuery({
    queryKey: queryKeys.appointments(ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const service = getDataService();
      return await service.getAppointments(ownerId);
    },
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * TanStack Mutation hook to book a new appointment.
 */
export function useBookAppointmentMutation() {
  const queryClient = useQueryClient();
  const bookAppointmentStore = useDataStore((state) => state.bookAppointment);

  return useMutation({
    mutationFn: async ({
      ownerId,
      input,
      clerkUser,
    }: {
      ownerId: string;
      input: BookingInput;
      clerkUser?: any;
    }) => {
      return await bookAppointmentStore(ownerId, input, clerkUser);
    },
    onSuccess: (newAppt, { ownerId }) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        if (old.some((a) => a.id === newAppt.id)) return old;
        return [newAppt, ...old];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(ownerId) });
    },
  });
}

/**
 * TanStack Mutation hook to cancel an appointment.
 */
export function useCancelAppointmentMutation() {
  const queryClient = useQueryClient();
  const cancelAppointmentStore = useDataStore((state) => state.cancelAppointment);

  return useMutation({
    mutationFn: async ({
      ownerId,
      apptId,
      clerkUser,
    }: {
      ownerId: string;
      apptId: string;
      clerkUser?: any;
    }) => {
      await cancelAppointmentStore(ownerId, apptId, clerkUser);
      return { ownerId, apptId };
    },
    onSuccess: ({ ownerId, apptId }) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        return old.map((a) => (a.id === apptId ? { ...a, status: 'cancelled' as const } : a));
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(ownerId) });
    },
  });
}
