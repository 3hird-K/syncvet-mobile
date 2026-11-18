# Clinic Queue Requirements — Mobile App Specification

Source of truth: current SyncVet web implementation
(`src/lib/cvo-queue.ts`, `src/components/dashboard/todays-operations-card.tsx`,
`src/components/dashboard/pet-owner-queue-tracker.tsx`,
`src/app/(dashboard)/queue-checkin/page.tsx`,
`supabase/migrations/20261104_create_queue_tickets.sql`).

This document describes **Today's Clinic Queue** behavior for reuse in a mobile app.
It is deliberately kept separate from the Field Operation attendance QR — see
`docs/qr-scanning-requirements.md` for that family.

---

## 0. Hard boundary: this is NOT the field-op QR

| | Field Operation attendance | Today's Clinic Queue |
|---|---|---|
| Route | `/outreach-checkin` | `/queue-checkin` |
| `type` | `outreach-attendance` | `clinic-queue` |
| Identity | `opId` (outreach program) | `station` + `token=cvo-queue-<date>` + JSON appointment pass |
| Result | Marks attendance for an event | Joins today's clinic line and issues a ticket |

A scanner must **reject** a payload from the other family. They share UI, not semantics.
Never route a `clinic-queue` scan to outreach check-in, or an `outreach-attendance` scan
to the queue.

---

## 1. Data model

### 1.1 `QueueTicket` — one per pet per day (`src/lib/cvo-queue.ts:7-34`)

```ts
export interface QueueTicket {
  id: string;                    // e.g. "q_ticket_1793265000"
  ticketNumber: string;          // e.g. "Q-001"
  queueSequence: number;         // e.g. 1
  appointmentId: string;
  date: string;                  // "YYYY-MM-DD"
  checkInTime: string;           // "08:30 AM"
  checkedInAt: string;           // ISO string
  ownerId: string;
  ownerName: string;
  ownerContact?: string;
  ownerBarangay?: string;
  petId?: string;
  petName: string;
  petPhotoUrl?: string;
  species: "Dog" | "Cat" | string;
  breed?: string;
  serviceId: "vaccination" | "spay-neuter" | "consultation" | string;
  serviceTitle: string;
  status: "waiting" | "in-consultation" | "completed" | "skipped" | "overdue";
  servingVet?: string;
  consultationRoom?: string;
  calledAt?: string;
  completedAt?: string;
  notes?: string;
  encounterNo?: string;
  checkedInVia?: "qr" | "manual";
}
```

Status enum: `waiting | in-consultation | completed | skipped | overdue`.
Check-in source: `qr | manual`.

### 1.2 `DailyQueueState` — one per day (`src/lib/cvo-queue.ts:36-45`)

```ts
export interface DailyQueueState {
  date: string;
  activeTickets: QueueTicket[];
  nowServingTicketNumber: string | null;
  servingVet?: string;
  servingRoom?: string;
  lastCalledAt?: string;
  isClosed?: boolean;
  closedReason?: string;
}
```

Web local-storage key: `syncvet_clinic_queue_<YYYY-MM-DD>`. For mobile, treat the
Supabase table `public.queue_tickets` as the source of truth, not this mirror.

### 1.3 Supabase schema (verbatim from migration)

`supabase/migrations/20261104_create_queue_tickets.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.queue_tickets (
    id                  TEXT PRIMARY KEY,
    date                DATE NOT NULL,
    ticket_number       TEXT NOT NULL,                    -- e.g. Q-001
    queue_sequence      INTEGER NOT NULL,
    appointment_id      TEXT,                             -- appointments.id or encounter ref
    encounter_no        TEXT,                             -- consultations.encounter_no
    owner_id            TEXT,
    owner_name          TEXT,
    owner_contact       TEXT,
    owner_barangay      TEXT,
    pet_id              TEXT,
    pet_name            TEXT NOT NULL,
    pet_photo_url       TEXT,
    species             TEXT,
    breed               TEXT,
    service_id          TEXT,                             -- vaccination | spay-neuter | consultation | ...
    service_title       TEXT,
    status              TEXT NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting', 'in-consultation', 'completed', 'skipped', 'overdue')),
    serving_vet         TEXT,
    consultation_room   TEXT,
    check_in_time       TEXT,                             -- display string e.g. "08:05 AM"
    checked_in_at       TIMESTAMPTZ,
    called_at           TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    notes               TEXT,
    checked_in_via      TEXT,                             -- qr | manual
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_date_status
    ON public.queue_tickets (date, status);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_date_sequence
    ON public.queue_tickets (date, queue_sequence);

-- updated_at trigger, RLS policies (public read/insert/update/delete in the web app),
-- and realtime publication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
```

Full migration includes `set_queue_tickets_updated_at()` trigger, four permissive RLS
policies, and guarded realtime publication.

---

## 2. Ticket numbering, deduplication, rejoin

- Format **`Q-NNN`**, sequence = `max(existing queueSequence for the date) + 1`.
- **Duplicate check-in is idempotent:** if the same pet/appointment already has an
  active ticket (`waiting` or `in-consultation`) today, return that ticket; do not
  create a second.
- `skipped` or `overdue` tickets **may rejoin**: scanning again creates a new ticket
  at the end of the line with a new sequence.
- `checkedInVia` records whether the ticket came from QR or staff manual entry.
- ⚠️ Web allocates the sequence client-side, which races when two owners scan at once.
  **Mobile must allocate server-side** (transaction/RPC + unique `(date, queue_sequence)`).
  The migration currently only has `UNIQUE (date, ticket_number)`.

---

## 3. Time gates

- Check-in blocked before **8:00 AM**.
- Transactions allowed **8:00 AM – 5:00 PM**.
- Queue closes at **6:00 PM**; afterward owners see "Queue Closed".
- `waiting` / `in-consultation` tickets left unattended become **`overdue`** lazily
  (drives the owner's "Schedule Overdue" state).
- Helpers live in `src/lib/utils.ts`: `isBeforeClinicOpen()`, `isClinicQueueClosed()`,
  `getFieldOpGracePeriod()`.
- Use **server time**, not device clock — the web's device-local clock is a known gap.

---

## 4. Staff operations (call / complete / skip)

Only authenticated staff may perform these. Gate by role in your mobile API — the web
has no DB-level staff RLS (policies are open), so do not copy that.

| Action | Transition | Side effects |
|---|---|---|
| `callQueueTicket()` | `waiting` → `in-consultation` | Sets `nowServingTicketNumber`, `servingVet`, `consultationRoom`, `calledAt`; linked appointment → `in-consultation`; broadcasts `queue_state_updated`; toast `Calling Ticket ${ticketNumber} (${petName})! Broadcast sent to pet owner.` |
| `completeQueueTicket()` | `in-consultation` → `completed` | Sets `completedAt`; appointment → `completed`; toast `Ticket ${ticketNumber} (${petName}) completed.` |
| `skipQueueTicket()` | active → `skipped` | Appointment → `missed`; owner told to scan again to rejoin at end of line. |
| `completeQueueForConsultation()` | consultation done → `completed` | Finishing a consultation auto-completes the linked queue ticket. |

"Now Serving", serving vet, and room are set by **Call** and displayed on both the
staff card and the owner tracker.

### Core engine exports (`src/lib/cvo-queue.ts`)

```
getTodayDateStr(): string
getDailyQueue(dateStr?): DailyQueueState
syncQueueFromSupabase(dateStr?): Promise<void>
saveDailyQueue(state): void
deleteQueueTicketsByRef(ref): Promise<void>
syncConsultationsToQueue(consultations, dateStr?)
completeQueueForConsultation(consultation, dateStr?)
checkInPetOwnerToQueue({ ... }): QueueTicket
callQueueTicket(ticketNumber, vetName?, room?, dateStr?)
completeQueueTicket(ticketNumber, dateStr?)
skipQueueTicket(ticketNumber, dateStr?)
removeQueueTicket(ticketNumber, dateStr?)
resetPetOwnerQueue()
getPetOwnerQueueStatus(...): PetOwnerQueueLookup
```

---

## 5. Pet-owner experience (tracker states)

Render these states from the ticket + daily state
(`src/components/dashboard/pet-owner-queue-tracker.tsx`):

1. **Ready for Check-In** — no ticket yet, scan the station QR.
2. **Schedule Overdue** — window passed / ticket overdue.
3. **Marked No-Show / Scan QR to Rejoin** — ticket `skipped` or `overdue`.
4. **In Queue — N ahead** — `waiting`; N = active tickets with smaller sequence.
5. **You're Next** — about to be called.
6. **Now Calling You** — ticket matches `nowServingTicketNumber`.
7. **Visit Completed** — `completed`.
8. **Queue Closed (Overdue)** — after 6 PM / closed flag.

**Call alert (critical):** on being called, the web fires **8 chimes** and a
**14-second** toast:

```
Ticket ${currentTicketNo} is called. Please proceed to the clinic desk with ${petName}.
```

with a **"Hear Chime"** replay action. Mobile should mirror this as a high-priority
local notification with sound/vibration and a replay control.

After check-in, `/queue-checkin` shows a boarding pass: ticket number, pet, service,
check-in time, live position, and error states (closed / duplicate / invalid token).

---

## 6. Realtime & sync

- Broadcast event: **`queue_state_updated`** on channel `cvo-queue-realtime-channel`
  (web uses three different channel names — pick one canonical name for mobile).
- `postgres_changes` subscriptions on `queue_tickets` and `appointments`.
- Owner tracker also **polls every 3 seconds** as fallback.
- Table `public.queue_tickets` is in the `supabase_realtime` publication.
- Public/anon Supabase client can read/write queue rows, but **mobile writes must be
  authenticated** — do not copy the web's anon write model.

---

## 7. Mobile "do not copy these web bugs" checklist

1. Allocate ticket numbers **server-side** (unique `(date, queue_sequence)`).
2. Make the **DB authoritative**, not localStorage.
3. Regenerate typed Supabase types — `queue_tickets` is missing from `database.types.ts`.
4. Enforce **staff role/RLS** on call/complete/skip.
5. Use **one realtime channel name**, await sends, handle reconnection.
6. Use **server clock** for all time gates.
7. Add an **audit log** for call/complete/skip/rejoin (web has none).
8. Keep field-op and queue QR payloads strictly separated.
9. Subscribe the boarding-pass screen to realtime (web page has no subscription).
