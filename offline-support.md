Act as a Senior React Native + Expo + Clerk Authentication Engineer and Mobile Systems Architect with 10+ years of professional experience building production-grade offline-first mobile applications.

You are working on my existing mobile application:

PROJECT: SyncVet
PURPOSE: Veterinary office / municipal veterinary service mobile application
STACK: React Native + Expo + Expo Router + TypeScript + Clerk Authentication
BACKEND: Existing backend/database implementation — DO NOT replace or redesign it unless absolutely necessary.

Your primary objective is to improve the EXISTING SyncVet application by implementing a professional OFFLINE-FIRST architecture while preserving the current UI, navigation, authentication flows, database structure, and existing features.

IMPORTANT:
Do NOT rebuild the application from scratch.
Do NOT randomly replace existing libraries.
Do NOT redesign unrelated screens.
Do NOT remove working functionality.
First inspect the existing project structure and understand how authentication, data fetching, mutations, storage, navigation, and API/database communication currently work.

==================================================

1. # FIRST: AUDIT THE EXISTING APPLICATION

Before making changes, analyze:

- package.json
- Expo configuration
- app.json/app.config.\*
- Expo Router structure
- Clerk configuration
- ClerkProvider
- authentication/session handling
- current token storage
- API/database service layer
- Supabase/backend integration if present
- React Query/TanStack Query if present
- Zustand/Context/Redux if present
- local storage implementation
- AsyncStorage/SecureStore usage
- existing hooks
- data fetching patterns
- mutation patterns
- loading states
- error states
- network handling
- authentication guards
- pet-related data models
- owner/user data
- veterinary records
- vaccination records
- appointments
- notifications
- profile information
- any existing caching

Do not assume the architecture.

Identify exactly where the application currently depends on an internet connection.

Then provide a concise architecture assessment:

CURRENT ARCHITECTURE
CURRENT AUTH FLOW
CURRENT DATA FLOW
CURRENT STORAGE
CURRENT NETWORK DEPENDENCIES
CURRENT OFFLINE LIMITATIONS
RECOMMENDED OFFLINE-FIRST ARCHITECTURE

Only after this audit should implementation begin.

# ================================================== 2. IMPLEMENT CLERK OFFLINE AUTHENTICATION PROPERLY

Use the CURRENT Clerk Expo SDK documentation and recommended implementation patterns.

Use:

@clerk/expo
expo-secure-store
@clerk/expo/token-cache

The ClerkProvider should use Clerk's official tokenCache implementation rather than creating an unnecessary custom token storage implementation.

The target architecture should follow the current Clerk Expo approach:

- ClerkProvider
- tokenCache
- expo-secure-store
- Clerk session persistence
- cached authentication state
- offline-aware authentication handling

If the project's installed Clerk version supports Clerk's experimental offline resource cache, evaluate and implement:

@clerk/expo/resource-cache

and:

\_\_experimental_resourceCache={resourceCache}

However, treat this as an EXPERIMENTAL feature.

Do not scatter experimental Clerk logic throughout the application.

Create a clean authentication abstraction so that future Clerk API changes are isolated in one place.

The application should be able to:

1. Sign in while online.
2. Persist the authenticated Clerk session securely.
3. Close and reopen the application without unnecessarily requiring another login.
4. Start the application when there is no internet connection.
5. Restore the cached authenticated state when possible.
6. Allow the user to access locally cached SyncVet data while offline.
7. Detect when Clerk/network operations genuinely require connectivity.
8. Clearly distinguish:
   - authenticated
   - unauthenticated
   - loading
   - offline
   - authentication/network error

Do NOT implement fake authentication.

Do NOT store Clerk session tokens in AsyncStorage, plain files, SQLite, Zustand persistence, or other insecure storage.

Use Clerk's SecureStore-backed tokenCache.

# ================================================== 3. DESIGN A TRUE OFFLINE-FIRST DATA ARCHITECTURE

Offline-first should NOT simply mean:

"if internet fails, show an offline message."

Instead, design SyncVet so that locally available data remains usable without network access.

Follow this principle:

LOCAL DATA FIRST
↓
DISPLAY CACHED DATA
↓
USER ACTION
↓
WRITE LOCALLY
↓
QUEUE SYNC OPERATION
↓
NETWORK AVAILABLE
↓
SYNC WITH BACKEND
↓
UPDATE LOCAL CACHE

The application should remain useful even when the network is unavailable.

# ================================================== 4. IDENTIFY WHAT SHOULD BE AVAILABLE OFFLINE

Determine which SyncVet data is safe and useful to cache locally.

Prioritize read-heavy data such as:

- authenticated user's basic profile
- owner's information
- registered pets
- pet profiles
- species
- breed
- gender
- birth information
- vaccination records
- veterinary history
- appointments
- health records
- municipal veterinary information
- frequently accessed reference information

Do NOT blindly cache sensitive or unnecessary backend data.

Classify every important entity as:

A. Offline-readable
B. Offline-writable
C. Online-only
D. Never locally persisted

Explain why each classification is appropriate.

# ================================================== 5. LOCAL STORAGE STRATEGY

Choose the most appropriate local persistence strategy based on the EXISTING project.

Do not introduce multiple competing storage systems without justification.

Separate:

SECURE AUTH STORAGE
→ Clerk tokenCache
→ expo-secure-store

APPLICATION DATA CACHE
→ appropriate local persistence mechanism

OFFLINE MUTATION QUEUE
→ durable local persistence

Do not store application data inside Clerk's token cache.

Do not store large datasets in SecureStore simply because it is secure.

Use secure storage for credentials/tokens and an appropriate persistent local data store for application data.

If the existing project already has a suitable caching/data layer, extend it rather than replacing it.

# ================================================== 6. OFFLINE MUTATION QUEUE

Implement a durable offline mutation queue for actions that can safely be synchronized later.

Examples:

- creating/editing a pet profile
- updating pet information
- updating owner information
- creating an appointment request
- updating appropriate veterinary records

Every queued operation should contain enough metadata to safely synchronize later, for example:

- operation ID
- entity type
- entity ID
- operation type
- payload
- createdAt
- updatedAt
- retryCount
- status
- lastError
- idempotency information where appropriate

Example conceptual structure:

{
id: "operation-id",
entity: "pet",
entityId: "pet-id",
operation: "UPDATE",
payload: {},
createdAt: "...",
retryCount: 0,
status: "pending"
}

Do NOT blindly send duplicate mutations.

Synchronization must be idempotent wherever possible.

# ================================================== 7. NETWORK DETECTION

Implement reliable network-state awareness.

The application should know when it is:

ONLINE
OFFLINE
RECONNECTING
SYNCING

Avoid relying only on a single request failure to determine connectivity.

Create a centralized network state abstraction/hook such as:

useNetworkStatus()

or an equivalent architecture appropriate for the existing project.

The rest of the application should not repeatedly implement its own network detection.

# ================================================== 8. SYNCHRONIZATION ENGINE

Create a centralized synchronization mechanism.

Example conceptual flow:

App starts
↓
Restore Clerk session
↓
Load local SyncVet data
↓
Render application immediately
↓
Check network
↓
If offline → continue normally
↓
If online → synchronize
↓
Pull remote changes
↓
Resolve conflicts
↓
Push queued local changes
↓
Refresh local cache
↓
Mark synchronization complete

The user should NOT have to manually restart the application to synchronize data.

Trigger synchronization when appropriate, such as:

- application startup
- application returning to foreground
- network becoming available
- manual pull-to-refresh
- after successful mutation

Avoid excessive network requests.

# ================================================== 9. CONFLICT RESOLUTION

Design an explicit conflict-resolution strategy.

Do NOT simply overwrite data blindly.

For each mutable entity, determine whether the correct strategy is:

- server wins
- client wins
- last-write-wins
- field-level merge
- explicit conflict requiring user resolution

Document the decision.

For example:

LOCAL CHANGE +
REMOTE CHANGE
↓
CONFLICT DETECTION
↓
CONFLICT STRATEGY
↓
FINAL STATE
↓
UPDATE LOCAL CACHE

Make sure timestamps, version numbers, or other reliable mechanisms are used where appropriate.

# ================================================== 10. UI/UX FOR OFFLINE MODE

Do NOT redesign the entire SyncVet UI.

Add subtle, professional offline-first feedback.

Examples:

- small "Offline" status indicator
- "Last synced 5 minutes ago"
- pending sync indicator
- syncing indicator
- successfully synced state
- retry action when necessary
- unobtrusive network status banner

The interface should NOT constantly show alarming error messages when the user is offline.

Offline mode should feel like a normal application state.

Example:

ONLINE
● Synced

OFFLINE
○ Offline · Last synced 10 min ago

SYNCING
↻ Syncing...

SYNC COMPLETE
✓ Synced just now

Use appropriate accessibility labels and avoid relying only on color.

# ================================================== 11. LOADING STATES

Eliminate unnecessary full-screen loading whenever cached data exists.

Bad:

OPEN APP
↓
LOADING...
↓
NETWORK REQUEST
↓
SHOW DATA

Preferred:

OPEN APP
↓
RESTORE AUTH
↓
LOAD LOCAL DATA
↓
SHOW UI IMMEDIATELY
↓
BACKGROUND SYNC
↓
UPDATE UI

Use skeletons only when appropriate.

If local data exists, display it immediately.

# ================================================== 12. ERROR HANDLING

Create clear distinctions between:

- offline
- authentication error
- expired session
- backend/server error
- validation error
- synchronization conflict
- temporary network failure
- permanent mutation failure

Do not display generic:

"Something went wrong."

Provide useful recovery actions.

For Clerk-specific errors, follow the current Clerk documentation and correctly distinguish offline/network errors from unauthenticated states.

Do not redirect the user to login merely because the device temporarily lost internet access.

# ================================================== 13. SECURITY REQUIREMENTS

Treat authentication and application data separately.

Requirements:

- Clerk tokens → SecureStore-backed Clerk tokenCache
- Never log authentication tokens
- Never log sensitive personal data
- Never place secrets in AsyncStorage
- Never hardcode private API keys
- Never expose service-role credentials in the mobile application
- Never assume cached authentication means unlimited authorization
- Backend authorization must remain authoritative
- Validate mutations on the server
- Avoid storing unnecessary sensitive records locally
- Clear user-specific application cache when appropriate after account/session changes

The offline system must improve resilience without weakening authorization.

# ================================================== 14. DATA CONSISTENCY

Make local cache updates predictable.

For every mutation:

ONLINE:

User action
↓
Optimistic/local update
↓
Backend request
↓
Success
↓
Confirm local state

OFFLINE:

User action
↓
Optimistic/local update
↓
Persist mutation queue
↓
Show "Pending sync"
↓
Network returns
↓
Sync operation
↓
Backend confirms
↓
Mark operation complete

If synchronization fails:

DO NOT silently discard the user's changes.

Keep the operation queued when retryable.

For non-retryable failures, surface a clear error and allow recovery.

# ================================================== 15. ARCHITECTURE QUALITY

Use clean separation of concerns.

Prefer an architecture similar to:

src/
app/
components/
features/
hooks/
services/
auth/
api/
sync/
network/
storage/
repositories/
providers/
types/
utils/

Adapt this to the existing project's architecture instead of blindly creating this exact structure.

Important principle:

UI
↓
Hooks
↓
Repositories / Services
↓
Local Store + Remote API
↓
Synchronization Layer

Screens should NOT directly contain complex synchronization logic.

# ================================================== 16. AUTHENTICATION + OFFLINE ROUTING

Review existing Expo Router route guards.

Ensure the router does not incorrectly behave like:

if (!network) redirect to login

Instead:

if authenticated locally
→ allow authenticated application access

if unauthenticated
→ authentication flow

if authentication state is still loading
→ wait

if offline and cached authenticated session exists
→ allow offline access according to the app's offline policy

Do not create security vulnerabilities by trusting arbitrary locally stored "isLoggedIn" flags.

Use Clerk's actual authentication state.

# ================================================== 17. IMPLEMENTATION PROCESS

Work incrementally.

PHASE 1
Audit current architecture.

PHASE 2
Fix/polish Clerk authentication persistence using the current Clerk Expo implementation.

PHASE 3
Add Clerk offline resource caching if compatible with the installed Clerk version.

PHASE 4
Introduce centralized network-state handling.

PHASE 5
Introduce persistent application-data caching.

PHASE 6
Implement offline reads.

PHASE 7
Implement offline mutations.

PHASE 8
Implement durable synchronization queue.

PHASE 9
Implement conflict/error handling.

PHASE 10
Add polished offline/sync UI indicators.

PHASE 11
Test every important offline scenario.

Do not make a massive uncontrolled rewrite.

# ================================================== 18. TESTING REQUIREMENTS

Test at minimum:

TEST 1
Login while online → close app → reopen → verify session persistence.

TEST 2
Login while online → disable internet → reopen app → verify cached authentication behavior.

TEST 3
Open previously loaded pet profiles while offline.

TEST 4
Open previously cached veterinary records while offline.

TEST 5
Modify an allowed record while offline.

TEST 6
Verify mutation is persisted in the offline queue.

TEST 7
Restore internet.

TEST 8
Verify queued mutation synchronizes automatically.

TEST 9
Kill application while mutations are pending.

TEST 10
Reopen application.

TEST 11
Verify pending operations remain durable.

TEST 12
Create simultaneous local/remote changes and verify conflict strategy.

TEST 13
Expire/revoke the Clerk session and verify the app handles it correctly.

TEST 14
Switch rapidly between online/offline states.

TEST 15
Launch the app with no internet connection and no previously cached data.

Document the expected result for every test.

# ================================================== 19. PERFORMANCE REQUIREMENTS

The offline architecture should:

- minimize unnecessary network calls
- avoid excessive re-renders
- avoid blocking app startup unnecessarily
- avoid storing huge datasets unnecessarily
- avoid duplicate synchronization
- debounce/throttle appropriate sync triggers
- process queues efficiently
- prevent infinite retry loops
- preserve battery/network efficiency

# ================================================== 20. DO NOT DO THESE THINGS

DO NOT:

- rebuild the app from scratch
- replace Clerk
- replace the backend without justification
- store Clerk tokens in AsyncStorage
- create fake authentication
- assume offline means authenticated forever
- blindly retry failed mutations forever
- duplicate the entire database locally
- cache everything
- expose backend secrets
- put synchronization logic inside UI components
- make every screen responsible for network detection
- destroy existing working features
- redesign unrelated UI
- introduce unnecessary dependencies

# ================================================== 21. FINAL DELIVERABLE

After implementation, provide:

1. Architecture summary
2. Files changed
3. Dependencies added
4. Clerk configuration changes
5. Offline storage strategy
6. Offline mutation strategy
7. Synchronization strategy
8. Conflict-resolution strategy
9. Security considerations
10. Testing performed
11. Remaining limitations
12. Recommended future improvements

Most importantly:

Build this as a REAL production-quality offline-first React Native/Expo application, not as a demo that merely displays cached data.

The user experience should feel:

FAST
RELIABLE
SECURE
NATIVE
OFFLINE-CAPABLE
CONSISTENT
PROFESSIONAL

Preserve the existing SyncVet product identity and UI while significantly improving its reliability under poor or unavailable network conditions.

Use the current official Clerk Expo documentation as the source of truth for Clerk-specific implementation details, especially SecureStore-backed token caching and Clerk's experimental offline resource cache.
