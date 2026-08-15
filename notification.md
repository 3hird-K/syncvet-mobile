Act as a Senior React Native + Expo Mobile Systems Engineer with 10+ years
of professional experience building production-grade mobile applications,
background tasks, local notifications, scheduling systems, offline-first
architectures, and notification-driven UX.

You are working on my EXISTING SyncVet mobile application.

PROJECT:
SyncVet — Veterinary / Municipal Veterinary Office Mobile Application

CURRENT STACK:

- React Native
- Expo
- Expo Router
- TypeScript
- Clerk Authentication
- Existing backend/database
- Existing offline-first architecture
- Existing SyncVet screens, components, pets, veterinary records,
  appointments, vaccination records, etc.

YOUR PRIMARY TASK:

Implement a PROFESSIONAL, RELIABLE, OFFLINE-FIRST LOCAL NOTIFICATION
AND REMINDER SYSTEM into the EXISTING SyncVet application.

IMPORTANT:

DO NOT rebuild SyncVet.

DO NOT replace the existing architecture unnecessarily.

DO NOT redesign unrelated screens.

DO NOT introduce notification logic directly into every screen.

FIRST inspect the existing application and understand its current:

- authentication
- user/session system
- pet data
- pet profiles
- vaccination records
- veterinary records
- appointments
- schedules
- medication/treatment information
- reminders
- notifications
- local storage
- offline-first architecture
- synchronization engine
- backend/database
- existing hooks/services
- Expo configuration
- app lifecycle
- navigation
- settings/preferences

Then integrate the notification system into the existing architecture.

==================================================

1. # USE EXPO'S NATIVE NOTIFICATION SYSTEM

Use the appropriate Expo notification APIs for the installed Expo SDK.

Prefer local/scheduled notifications for reminders that are based on
known dates and times.

The system must be capable of scheduling notifications that can trigger
even when:

- the application is closed
- the application is running in the background
- the user is offline

Do not depend on the SyncVet JavaScript application remaining open in order
for scheduled local reminders to trigger.

The operating system should handle scheduled local notifications whenever
possible.

Verify the implementation against the current Expo documentation and the
installed Expo SDK version.

# ================================================== 2. FIRST AUDIT ALL EXISTING DATA THAT CAN GENERATE REMINDERS

Do not only implement appointment reminders.

Inspect ALL existing SyncVet entities and determine which ones can
reasonably produce a reminder.

Create a REMINDER SOURCE MATRIX.

Example:

DATA SOURCE
↓
EVENT
↓
REMINDER TYPE
↓
DATE/TIME
↓
NOTIFICATION CONTENT
↓
SCHEDULED / IMMEDIATE / RECURRING
↓
CAN WORK OFFLINE?
↓
SYNC REQUIREMENT

Potential reminder sources include:

PET HEALTH

- vaccination due dates
- vaccination schedules
- booster reminders
- deworming schedules
- parasite prevention
- medication schedules
- treatment schedules
- follow-up care
- veterinary checkups
- health monitoring
- weight/health follow-up where applicable

APPOINTMENTS

- upcoming appointment
- appointment tomorrow
- appointment in several hours
- appointment starting soon
- appointment changes
- appointment cancellation
- appointment rescheduling

VETERINARY RECORDS

- follow-up dates
- scheduled recheck
- treatment completion
- required follow-up
- recurring treatment

PET CARE

- recurring preventive care
- scheduled care tasks
- important health dates

MUNICIPAL / VETERINARY PROGRAMS

- program schedules
- vaccination campaigns
- registration schedules
- public veterinary events
- other date-based programs if present in the existing system

SYSTEM

- pending synchronization
- failed synchronization requiring user attention
- important account/application events

Only implement reminder types that make sense for the existing SyncVet
data model.

DO NOT invent medical schedules or veterinary recommendations that are
not already represented by the application's data or configured by the
veterinary/municipal system.

# ================================================== 3. CENTRALIZED REMINDER ENGINE

Create a centralized reminder/notification service.

Do NOT place notification scheduling code directly inside UI components.

Preferred conceptual architecture:

SyncVet Data
↓
Reminder Rules
↓
Reminder Engine
↓
Notification Scheduler
↓
Expo Notifications
↓
Operating System
↓
User Notification

For example:

Pet vaccination date
↓
Reminder rule
↓
Calculate reminder times
↓
Schedule local notifications
↓
OS stores scheduled notification
↓
User receives reminder

The exact architecture should follow the existing project's conventions.

# ================================================== 4. CREATE A REMINDER MODEL

Create a structured reminder model.

Conceptually:

Reminder {
id
userId
petId
type
title
body
scheduledAt
timezone
repeatPattern
sourceEntity
sourceEntityId
enabled
status
createdAt
updatedAt
}

Adapt this to the existing database/types.

Every reminder must have a stable identifier so that it can be:

- created
- updated
- cancelled
- rescheduled
- synchronized
- deduplicated

Do NOT create duplicate notifications every time the app opens.

# ================================================== 5. NOTIFICATION CONTENT MUST BE USEFUL

Notifications should contain enough information for the user to understand
what needs attention WITHOUT requiring them to open the application first.

Avoid generic notifications such as:

"Reminder"

Instead use meaningful content.

Examples:

"Jen's vaccination is due tomorrow"
"Jen has a veterinary appointment tomorrow at 9:00 AM"
"Jen's appointment starts in 1 hour"
"Jen has a scheduled follow-up today"
"Jen's treatment reminder"
"SyncVet has pending changes waiting to sync"

Where appropriate, include:

- pet name
- reminder type
- appointment date
- appointment time
- veterinary service
- clinic/office information if already available
- relevant action/context
- urgency where appropriate

Do not expose unnecessary sensitive information in notification previews.

Respect privacy and notification lock-screen visibility.

# ================================================== 6. SMART REMINDER TIMING

Do not schedule only one notification for every event.

Where appropriate, support configurable reminder offsets.

For example:

Appointment:

- several days before
- one day before
- several hours before
- shortly before the appointment

Vaccination:

- configurable advance reminder
- due-date reminder
- overdue reminder if supported by the application's data model

Medication/treatment:

- exact scheduled time
- recurring schedule
- missed/pending reminder where appropriate

However:

DO NOT hardcode veterinary schedules or medical recommendations.

Reminder timing must come from:

- existing application data
- user-configured preferences
- veterinary/municipal configuration
- explicit event settings

The notification engine should be flexible enough to support different
reminder offsets without rewriting the notification system.

# ================================================== 7. RECURRING REMINDERS

Support recurring reminders where the existing data model requires them.

Examples:

- recurring medication
- recurring treatment
- recurring preventive care
- recurring appointments

The system should support appropriate recurrence patterns such as:

- daily
- weekly
- monthly
- custom schedule

Do not create infinite duplicate schedules.

When a recurring event is changed or deleted:

→ cancel the old schedule
→ create the updated schedule

# ================================================== 8. OFFLINE-FIRST NOTIFICATIONS

Notifications MUST integrate with SyncVet's existing offline-first
architecture.

IMPORTANT:

If the application already knows the reminder information locally, it
should be able to schedule the local notification WITHOUT requiring an
internet connection.

Example:

User previously synchronized:

Pet:
Jen

Vaccination:
August 30, 2026

Reminder:
August 29, 2026 at 9:00 AM

The device should be capable of scheduling the reminder locally.

The app must NOT require:

Internet

- Backend request
- Application open

for every notification.

Instead:

LOCAL DATA
↓
REMINDER ENGINE
↓
LOCAL NOTIFICATION SCHEDULE
↓
OPERATING SYSTEM

When connectivity returns:

LOCAL DATA
↕
BACKEND
↓
SYNC
↓
RECONCILE REMINDERS

# ================================================== 9. NOTIFICATION SYNCHRONIZATION

Notifications and reminders must be synchronized with the existing
offline-first system.

When online:

Backend data
↓
Local cache
↓
Reminder engine
↓
Schedule/update local notifications

When offline:

Local cache
↓
Reminder engine
↓
Schedule local notifications

When connectivity returns:

Remote changes

- Local changes
  ↓
  Conflict resolution
  ↓
  Update reminder state
  ↓
  Cancel obsolete notifications
  ↓
  Schedule new notifications

Do NOT allow outdated reminders to remain scheduled after their underlying
event has been cancelled or changed.

# ================================================== 10. REMINDER RECONCILIATION

Create a reconciliation process.

Example:

Existing scheduled notifications:

A
B
C
D

Current local SyncVet data:

A
B
D
E

The system should:

KEEP A
KEEP B
CANCEL C
KEEP D
SCHEDULE E

Do not simply schedule everything again.

This prevents:

- duplicate notifications
- outdated reminders
- orphaned reminders
- notification spam

# ================================================== 11. APP STARTUP RECONCILIATION

When SyncVet launches:

1. Restore authentication.
2. Load local data.
3. Load existing reminder configuration.
4. Check notification permissions.
5. Compare local reminder state against scheduled notifications.
6. Cancel obsolete notifications.
7. Schedule missing notifications.
8. Update reminder metadata.
9. Continue normal application startup.

Do not block the entire application startup unnecessarily.

Notification reconciliation should be efficient.

# ================================================== 12. BACKGROUND / APP CLOSED BEHAVIOR

The notification architecture must work correctly when the application is:

- foreground
- background
- completely closed
- device restarted, where supported by the platform/notification API

Do not rely on React components remaining mounted.

Do not rely on setTimeout().
Do not rely on setInterval().
Do not rely on an active JavaScript process.

Scheduled notifications should be registered with the operating system
through the appropriate Expo notification APIs.

# ================================================== 13. FOREGROUND NOTIFICATION BEHAVIOR

Define what happens when a notification fires while SyncVet is open.

Do not automatically create confusing duplicate UI.

Provide an appropriate foreground notification behavior.

For example:

Notification received
↓
Display appropriate in-app notification/banner
OR
system notification behavior where appropriate

The behavior should be consistent with the existing SyncVet UI.

# ================================================== 14. NOTIFICATION TAP BEHAVIOR

Notifications should be actionable.

When the user taps:

"Jen's vaccination is due tomorrow"

the application should navigate to the relevant:

Pet Profile
→ Vaccination / Health section

When the user taps:

"Jen has a veterinary appointment tomorrow at 9:00 AM"

navigate to:

Appointments
→ Relevant appointment

When the user taps another reminder:

→ Open the relevant entity/screen.

Use deep linking or Expo Router navigation appropriately.

Every notification should carry enough structured metadata to determine
where the user should be taken.

Do not hardcode navigation logic into the notification text.

# ================================================== 15. NOTIFICATION PERMISSION HANDLING

Implement proper notification permission handling.

Do NOT repeatedly ask for notification permission.

The flow should explain why notifications are useful before requesting
permission where appropriate.

Handle:

- permission granted
- permission denied
- permission temporarily unavailable
- user disabled notifications in system settings
- notification permissions changed later

The application should gracefully continue if notifications are disabled.

Do not break core SyncVet functionality.

# ================================================== 16. USER NOTIFICATION PREFERENCES

Add or integrate notification preferences into the existing Settings
system.

Allow users to control appropriate categories such as:

- Appointment reminders
- Vaccination reminders
- Medication/treatment reminders
- Follow-up reminders
- General veterinary reminders
- Municipal program reminders

Where appropriate, allow reminder timing customization.

Example:

Appointment reminders:
☑ 1 day before
☑ 1 hour before

Vaccination reminders:
☑ 7 days before
☑ 1 day before

Do not create excessive configuration.

Keep the UX simple and understandable.

# ================================================== 17. NOTIFICATION CHANNELS

For Android, properly configure notification channels according to the
current Expo/Android notification APIs.

Consider meaningful categories/channels such as:

- Appointments
- Pet Health
- Treatments
- General SyncVet

Use appropriate importance levels.

Do not make every notification high priority.

Only use higher importance when genuinely necessary.

# ================================================== 18. TIMEZONE AND DATE HANDLING

Treat date/time handling as a critical requirement.

Never blindly assume UTC.

Store and process timestamps consistently.

Consider:

- device timezone
- appointment timezone
- daylight saving changes
- date-only events
- recurring reminders
- time changes
- device clock changes

A reminder scheduled for:

9:00 AM

must not unexpectedly become:

1:00 AM

because of incorrect timezone conversion.

Use robust date/time handling consistent with the existing backend.

# ================================================== 19. DUPLICATE PREVENTION

The notification system MUST be idempotent.

If the app launches 10 times:

DO NOT create 10 copies of the same notification.

If synchronization runs repeatedly:

DO NOT create duplicate reminders.

Use stable reminder IDs and notification identifiers.

Conceptually:

Reminder ID
↓
Existing scheduled notification?
↓
YES → update/reuse
NO → schedule

# ================================================== 20. EVENT CHANGES

When an underlying event changes, update its notification schedule.

Examples:

Appointment:
September 10, 9:00 AM
↓
Changed to
September 12, 2:00 PM

The system must:

1. Identify the existing reminder.
2. Cancel obsolete notification schedules.
3. Calculate new reminder times.
4. Schedule the updated notifications.
5. Update local reminder state.
6. Synchronize the change with the backend when online.

If an appointment is cancelled:

→ cancel all associated reminders.

If a vaccination record is updated:

→ recalculate associated reminders.

If a pet is deleted:

→ remove its associated reminders.

# ================================================== 21. MISSED / OVERDUE REMINDERS

Handle reminders whose scheduled time has already passed.

Do NOT blindly schedule them immediately after the app starts.

Determine appropriate behavior based on the reminder type.

For example:

Past appointment
→ do not notify the user as if it is still upcoming.

Overdue health-related reminder
→ optionally show an appropriate overdue state if supported
by the application's data model.

Use clear wording.

# ================================================== 22. NOTIFICATION DATA VS NOTIFICATION PRESENTATION

Separate:

REMINDER DATA
from
NOTIFICATION PRESENTATION.

For example:

Reminder:

{
type: "appointment",
petId: "pet-123",
appointmentId: "appointment-456",
scheduledAt: "...",
reminderOffset: 60
}

Notification presentation:

Title:
"Jen's appointment is coming up"

Body:
"Jen has a veterinary appointment at 9:00 AM."

This allows notification content to change without changing the underlying
reminder architecture.

# ================================================== 23. SECURITY & PRIVACY

Notifications can appear on a locked device.

Therefore:

DO NOT include unnecessarily sensitive veterinary information.

Do not expose:

- private medical details
- authentication tokens
- backend credentials
- internal database information
- sensitive personal information

Only include the minimum useful information required for the reminder.

If appropriate, allow the user to control notification preview/privacy
settings.

# ================================================== 24. PERFORMANCE

The notification system must be efficient.

Avoid:

- scheduling hundreds of unnecessary notifications
- repeatedly cancelling/recreating all notifications
- excessive database queries
- excessive synchronization
- notification spam
- infinite background work
- blocking application startup

Schedule only what is necessary.

Use reconciliation rather than blindly rebuilding every notification on
every app launch.

# ================================================== 25. TESTING

Test all important scenarios.

TEST 1:
Create an appointment online.

Expected:
→ Reminder is scheduled.

TEST 2:
Close the application.

Expected:
→ Notification still fires at the scheduled time.

TEST 3:
Disable internet.

Expected:
→ Existing local reminder still works.

TEST 4:
Change an appointment time.

Expected:
→ Old reminder is removed.
→ New reminder is scheduled.

TEST 5:
Cancel an appointment.

Expected:
→ Related reminders are cancelled.

TEST 6:
Open SyncVet multiple times.

Expected:
→ No duplicate notifications.

TEST 7:
Restart the device.

Expected:
→ Verify scheduled notification behavior according to the platform.

TEST 8:
Create a supported reminder while offline.

Expected:
→ Local reminder is scheduled.
→ Data is placed into the existing sync system if backend persistence
is required.

TEST 9:
Reconnect to the internet.

Expected:
→ Reminder synchronizes with backend.
→ Local and remote state reconcile.

TEST 10:
Deny notification permission.

Expected:
→ SyncVet continues working.
→ User receives an appropriate explanation/settings option.

TEST 11:
Tap notification.

Expected:
→ SyncVet opens the correct screen and relevant entity.

TEST 12:
Multiple pets have reminders.

Expected:
→ Each reminder identifies the correct pet.
→ No cross-pet navigation or duplicate notifications.

TEST 13:
Same reminder is synchronized multiple times.

Expected:
→ Exactly one scheduled reminder exists.

TEST 14:
User changes notification preferences.

Expected:
→ Existing relevant schedules are updated appropriately.

TEST 15:
Device timezone changes.

Expected:
→ Reminder times remain logically correct.

# ================================================== 26. ARCHITECTURE REQUIREMENT

Keep notification logic separate from UI.

Preferred architecture:

UI
↓
Reminder Hooks
↓
Reminder Service
↓
Reminder Repository
↓
Local Persistence
↓
Synchronization Engine
↓
Backend

AND:

Reminder Service
↓
Expo Notifications
↓
Operating System

Components should never directly manipulate dozens of notification
schedules.

# ================================================== 27. EXISTING SYSTEM INTEGRATION

Most importantly:

INTEGRATE WITH MY CURRENT SYNCVET SYSTEM.

Do not create a parallel pet system.

Do not create a second appointment system.

Do not create a second authentication system.

Do not create a second offline database unnecessarily.

Reuse the existing:

- Pet entities
- User/owner entities
- Appointment entities
- Veterinary records
- Vaccination records
- Offline cache
- Sync queue
- Authentication
- Settings
- Navigation
- Backend services

The notification system should consume the existing source of truth.

# ================================================== 28. FINAL IMPLEMENTATION REPORT

After implementation, provide:

1. Current notification architecture
2. Files created
3. Files modified
4. Expo packages added/updated
5. Notification permission flow
6. Reminder data model
7. Reminder scheduling strategy
8. Offline notification strategy
9. Synchronization strategy
10. Duplicate prevention strategy
11. Notification cancellation strategy
12. Notification tap/deep-link strategy
13. Timezone strategy
14. Android notification channels
15. iOS notification behavior
16. Privacy/security considerations
17. Testing performed
18. Known platform limitations
19. Remaining TODOs

The final result must feel like a production-quality notification system,
not a collection of setTimeout() calls or screen-specific notification
functions.

==================================================
CORE PRINCIPLE
==================================================

SyncVet notifications should be:

RELIABLE
OFFLINE-CAPABLE
SCHEDULED LOCALLY
DUPLICATE-SAFE
TIMEZONE-AWARE
SECURE
ACTIONABLE
SYNCHRONIZED
USER-CONTROLLED
BATTERY-EFFICIENT

The notification system should continue working even when SyncVet is not
currently open, whenever supported by the operating system and Expo's
notification APIs.

Treat notifications as a core mobile-system feature of SyncVet, not merely
a UI feature.
