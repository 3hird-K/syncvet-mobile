==================================================
3A. MAKE THE MAJORITY OF SYNCVET COMPONENTS OFFLINE-CAPABLE
==================================================

A major requirement of this implementation is that MOST of the existing
SyncVet application should remain usable when the device has no internet
connection.

Do NOT implement offline support only for selected screens.

Review EVERY existing screen, component, card, list, profile section,
dashboard widget, tab, form, and data-driven UI component and classify it
according to its network dependency.

Create an OFFLINE CAPABILITY MATRIX:

COMPONENT / SCREEN
↓
DATA SOURCE
↓
READ-ONLY / READ-WRITE
↓
CAN WORK OFFLINE?
↓
REQUIRED LOCAL DATA
↓
SYNC BEHAVIOR
↓
OFFLINE UI BEHAVIOR

Classify components into:

## A. FULLY OFFLINE-CAPABLE

Components that can operate entirely from locally persisted data.

Examples:

- Pet list
- Pet profile
- Owner profile
- Previously viewed veterinary records
- Vaccination history
- Local dashboard statistics
- Local navigation
- Settings
- Previously loaded reference information

These components should render from local data immediately without waiting
for a network request.

---

## B. OFFLINE-READ / ONLINE-SYNC

Components that can display previously synchronized data offline but need
the backend when fresh data is required.

Examples:

- Veterinary records
- Vaccination records
- Appointment information
- Pet health history
- Notifications
- Municipal veterinary information

Expected behavior:

ONLINE
→ Fetch latest remote data
→ Update local cache
→ Render current data

OFFLINE
→ Read from local cache
→ Render cached data
→ Display an unobtrusive "Last synced..." indicator
→ Do NOT block the entire screen

---

## C. OFFLINE-WRITABLE / SYNC-LATER

Components where user actions can safely be performed offline and
synchronized later.

Examples:

- Edit pet information
- Update owner information
- Create supported records
- Update supported local information

Expected behavior:

OFFLINE
→ Save change locally
→ Update UI optimistically
→ Add operation to sync queue
→ Mark data as "Pending sync"

ONLINE
→ Synchronize operation
→ Confirm backend success
→ Update local cache
→ Remove operation from queue

---

## D. ONLINE-DEPENDENT COMPONENTS

Components that genuinely require a live backend or internet connection.

Examples may include:

- Live server-side searches
- Real-time information
- Actions requiring immediate server validation
- External web content
- Services that cannot reasonably be cached

These components MUST NOT pretend to work offline.

Instead, provide a proper offline state:

"You're offline"
"This feature requires an internet connection."

Provide an appropriate retry action.

---

## E. NEVER-CACHE / SECURITY-SENSITIVE DATA

Identify information that should never be persisted locally.

Do not cache sensitive information simply for convenience.

Every piece of data should have an explicit persistence policy.

==================================================
OFFLINE-FIRST COMPONENT RULE
==================================================

Every component that currently performs a fetch/request MUST be reviewed.

Do NOT allow components to follow this pattern:

Component mounts
↓
fetch()
↓
loading spinner
↓
error if offline

Instead, whenever appropriate, use:

Component mounts
↓
Read local data
↓
Render immediately
↓
Check network
↓
Fetch latest remote data if available
↓
Update local cache
↓
Refresh UI

The network should enhance the experience, not determine whether the
application is usable.

==================================================
FETCHABLE COMPONENT HANDLING
==================================================

For every component that fetches data, determine:

1. What data does it fetch?
2. Is the data safe to cache?
3. How long should it remain locally available?
4. What happens when the user opens the component offline?
5. What happens when cached data is stale?
6. When should the application refresh it?
7. What happens if the fetch fails?
8. Can the component operate with stale data?
9. Can user actions be queued?
10. How should synchronization update the component?

NEVER allow a fetchable component to simply fail because the network is
unavailable when usable cached data exists.

Use a stale-while-revalidate style approach where appropriate:

LOCAL CACHE
↓
DISPLAY CACHED DATA
↓
BACKGROUND REFRESH
↓
REMOTE DATA
↓
UPDATE CACHE
↓
UPDATE UI

==================================================
NO UNNECESSARY FULL-SCREEN LOADING
==================================================

If a component already has cached data, NEVER replace the entire component
with a full-screen loading state merely because a background refresh is
occurring.

Instead:

Cached content

- small refresh/sync indicator

For example:

## Pet Profile

Jen
Siamese
Male
2023

↻ Updating...

The user should still be able to interact with available content.

==================================================
OFFLINE-AWARE COMPONENT STATES
==================================================

Every data-driven component should have explicit states:

1. Initial loading
2. Local cached data available
3. Online + fetching
4. Online + fresh
5. Offline + cached
6. Offline + no cached data
7. Syncing
8. Sync pending
9. Sync failed
10. Server error

Do not treat all of these states as the same "loading/error" state.

==================================================
COMPONENT-LEVEL NETWORK LOGIC
==================================================

Do NOT allow every component to independently implement:

if (!network) ...
fetch(...)
try/catch(...)
retry(...)

Instead, centralize the behavior through reusable services/hooks such as:

- useNetworkStatus()
- useOfflineQuery()
- useOfflineMutation()
- useSyncStatus()
- useLocalData()
- useSyncQueue()

Use equivalent names if the existing architecture has better conventions.

The goal is to create reusable infrastructure so future SyncVet features
automatically follow the offline-first architecture.

==================================================
OFFLINE-FIRST DESIGN PRINCIPLE
==================================================

Follow this rule throughout the entire application:

"LOCAL DATA IS THE FIRST UI SOURCE.
THE NETWORK IS A SYNCHRONIZATION SOURCE."

The application should not think:

"No internet = application unavailable."

It should think:

"No internet = operate using the latest valid local state,
then synchronize when connectivity returns."

==================================================
NEW FEATURE REQUIREMENT
==================================================

After implementing the offline architecture, demonstrate that adding a new
data-driven SyncVet component does NOT require manually rebuilding the
offline system.

A new component should be able to use the existing offline infrastructure:

UI
↓
Offline-aware hook
↓
Repository
↓
Local storage/cache
↓
Remote API
↓
Synchronization engine

This architecture should make offline support a PLATFORM CAPABILITY of
SyncVet rather than a feature implemented separately on individual screens.

==================================================
OFFLINE COVERAGE REQUIREMENT
==================================================

Target the majority of the existing SyncVet user experience for offline
availability.

Before considering the implementation complete, generate a report showing:

TOTAL DATA-DRIVEN COMPONENTS: **_
FULLY OFFLINE-CAPABLE: _**
OFFLINE-READABLE: **_
OFFLINE-WRITABLE: _**
ONLINE-DEPENDENT: **_
NEVER-CACHED: _**

For every ONLINE-DEPENDENT component, explain why it cannot reasonably
operate offline.

For every OFFLINE-CAPABLE component, verify that it has:

✓ Local data source
✓ Offline loading behavior
✓ Empty-cache behavior
✓ Network recovery behavior
✓ Sync behavior where applicable
✓ Error handling
✓ Appropriate UI state
✓ No unnecessary full-screen loading

Do not mark the implementation complete until the existing application has
been systematically reviewed component-by-component.

==================================================
ONBOARDING MUST ALSO BE OFFLINE-AWARE
==================================================

Review the existing SyncVet onboarding flow as part of the offline-first
architecture.

The onboarding experience should NOT unnecessarily depend on network
connectivity.

Classify every onboarding step as:

- Fully offline
- Offline-capable
- Online-dependent
- Requires synchronization

Static onboarding content such as:

- Welcome screen
- Introduction
- Feature explanations
- App benefits
- Tutorial slides
- Local illustrations/assets
- Permission explanations

MUST work completely offline.

These screens should not perform unnecessary network requests.

If the onboarding flow contains registration/profile forms, determine
whether the entered information can safely be persisted locally and later
synchronized.

IMPORTANT:

Do NOT fake offline authentication.

New Clerk authentication/sign-up operations that require communication
with Clerk's servers should remain online-dependent.

However, an EXISTING authenticated Clerk session should be handled
according to Clerk's supported offline/session-persistence behavior.

==================================================
RETURNING USER ONBOARDING
==================================================

The application must distinguish between:

1. First-time user
2. Previously authenticated user
3. Previously authenticated user currently offline
4. Unauthenticated user currently offline

For a previously authenticated user:

ONLINE:
→ Restore Clerk session
→ Load local application data
→ Synchronize with backend

OFFLINE:
→ Restore available Clerk session state using Clerk's supported
persistence mechanisms
→ Load local SyncVet data
→ Allow access to approved offline-capable features
→ Do NOT unnecessarily redirect the user to login simply because
the network is unavailable

For a first-time unauthenticated user:

OFFLINE:
→ Allow access to static onboarding content
→ Clearly indicate when authentication requires connectivity
→ Do not pretend that a new online account can be created offline

==================================================
ONBOARDING ASSETS
==================================================

All onboarding assets that are required for the onboarding experience
should be bundled locally with the Expo application.

Do not fetch essential onboarding images, illustrations, fonts, or
animations from remote URLs if they are required for the initial
experience.

The onboarding screen should be fully functional in:

- Airplane mode
- No Wi-Fi
- No mobile data
- Slow/intermittent connection

==================================================
ONBOARDING COMPLETION STATE
==================================================

Persist the user's onboarding completion state locally using an
appropriate local persistence mechanism.

Avoid repeatedly showing onboarding because the network is unavailable.

For example:

first launch:
→ show onboarding

user completes onboarding:
→ persist completion locally

future launch:
→ read local onboarding state
→ continue to appropriate authentication/application route

Do not use a remote API request just to determine whether the user has
already completed local onboarding.

==================================================
ONBOARDING OFFLINE UX
==================================================

Offline status should NOT appear as an error on every onboarding screen.

If the current onboarding content does not require connectivity,
allow the user to continue normally.

Only show an offline/network message when the user reaches an action
that genuinely requires an internet connection.

The onboarding experience should remain polished and uninterrupted.
