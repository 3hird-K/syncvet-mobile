import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDataService } from '@services/data';
import { queryKeys } from '@lib/queryClient';
import { useDataStore } from '@store/useDataStore';
import type { Appointment, Pet, PetInput } from '@services/data/types';

/**
 * TanStack Query hook to fetch the resident's registered pets.
 */
export function usePetsQuery(ownerId: string) {
  return useQuery({
    queryKey: queryKeys.pets(ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const service = getDataService();
      return await service.getPets(ownerId);
    },
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * TanStack Mutation hook to add a new pet with optimistic UI and offline queue sync.
 */
export function useAddPetMutation() {
  const queryClient = useQueryClient();
  const addPetStore = useDataStore((state) => state.addPet);

  return useMutation({
    mutationFn: async ({
      ownerId,
      input,
      clerkUser,
    }: {
      ownerId: string;
      input: PetInput;
      clerkUser?: any;
    }) => {
      return await addPetStore(ownerId, input, clerkUser);
    },
    onSuccess: (newPet, { ownerId }) => {
      queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), (old = []) => {
        if (old.some((p) => p.id === newPet.id)) return old;
        return [newPet, ...old];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(ownerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(ownerId) });
    },
  });
}

/**
 * TanStack Mutation hook to update an existing pet.
 */
export function useUpdatePetMutation() {
  const queryClient = useQueryClient();
  const updatePetStore = useDataStore((state) => state.updatePet);

  return useMutation({
    mutationFn: async ({ pet, clerkUser }: { pet: Pet; clerkUser?: any }) => {
      await updatePetStore(pet, clerkUser);
      return pet;
    },
    onSuccess: (updatedPet) => {
      queryClient.setQueryData<Pet[]>(queryKeys.pets(updatedPet.ownerId), (old = []) => {
        return old.map((p) => (p.id === updatedPet.id ? updatedPet : p));
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(updatedPet.ownerId) });
    },
  });
}

/**
 * TanStack Mutation hook to delete a pet.
 */
export function useDeletePetMutation() {
  const queryClient = useQueryClient();
  const deletePetStore = useDataStore((state) => state.deletePet);

  return useMutation({
    mutationFn: async ({
      ownerId,
      petId,
      clerkUser,
    }: {
      ownerId: string;
      petId: string;
      clerkUser?: any;
    }) => {
      await deletePetStore(ownerId, petId, clerkUser);
      return { ownerId, petId };
    },
    onSuccess: ({ ownerId, petId }) => {
      // 1. Remove deleted pet from TanStack query cache
      queryClient.setQueryData<Pet[]>(queryKeys.pets(ownerId), (old = []) => {
        return old.filter((p) => p.id !== petId);
      });
      // 2. Cascade delete: remove all scheduled appointments for this pet from TanStack cache
      queryClient.setQueryData<Appointment[]>(queryKeys.appointments(ownerId), (old = []) => {
        return old.filter((a) => a.petId !== petId);
      });
      // 3. Invalidate both queries to synchronize fully with Supabase
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(ownerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(ownerId) });
    },
  });
}
