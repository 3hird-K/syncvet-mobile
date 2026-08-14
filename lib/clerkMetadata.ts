/**
 * Safely updates Clerk user metadata using updateMetadata (deep merge)
 * to prevent deprecation warnings in newer @clerk/expo releases,
 * with fallback to update() if updateMetadata is unavailable.
 */
export async function updateClerkUnsafeMetadata(
  clerkUser: any,
  unsafeMetadata: Record<string, any>,
): Promise<void> {
  if (!clerkUser) return;
  try {
    if (typeof clerkUser.updateMetadata === 'function') {
      await clerkUser.updateMetadata({
        unsafeMetadata,
      });
    } else if (typeof clerkUser.update === 'function') {
      await clerkUser.update({
        unsafeMetadata: {
          ...(clerkUser.unsafeMetadata || {}),
          ...unsafeMetadata,
        },
      });
    }
  } catch (error) {
    console.log('Clerk metadata update note:', error);
  }
}
