# Pet Owner View — History & Scheduling spec (for mobile implementation)

Source of truth: `src/app/(dashboard)/pet-owner/page.tsx` in `C:\Users\Admin\Documents\syncvet\syncvet-ui`.

## Where it lives

| Concern | File |
|---|---|
| Both tabs, filters, data assembly | `src/app/(dashboard)/pet-owner/page.tsx` (history `1242–1487`, scheduling `1489–1645`, UI `2331–3140`) |
| Procedure booking (vaccination / spay-neuter) | `src/components/dashboard/schedule-procedure-dialog.tsx` |
| Date picker | `src/components/dashboard/procedure-date-picker.tsx` |
| Reschedule | `src/components/dashboard/edit-appointment-dialog.tsx` |
| Consultation request | `src/components/dashboard/pet-owner-consultation-dialog.tsx` |
| Consultation data model | `src/data/cvo-store.ts` (`CVOConsultation`), `src/lib/cvo-context.tsx` |
| Slot capacity rules | `src/lib/cvo-slots.ts`, `src/lib/vaccination-rules.ts` |
| Queue / check-in | `src/lib/cvo-queue.ts`, `src/lib/qr-validation.ts`, `src/components/dashboard/pet-owner-queue-tracker.tsx` |
| QR check-in pages | `src/app/(dashboard)/queue-checkin/page.tsx`, `src/app/(dashboard)/outreach-checkin/page.tsx` |
| DB schema | `supabase/migrations/20261028_syncvet_complete_schema.sql`, `20261104_create_queue_tickets.sql` |
| Supabase clients | `src/lib/supabase/client.ts` |

---

## 1. History tab — "All Vaccinations, Consultations & Spay/Neuter History"

This is **not a single table**. It is a derived, deduplicated view over four sources (`page.tsx:1242–1462`):

1. **`consultations`** (via `useCVO()`) — clinical encounters: complaint, symptoms, vitals, diagnosis, treatment, medication, vet, status.
2. **`vaccination_records`** — official municipal immunization ledger (record no., vaccine, batch, administered date, next due, vet). Query at `page.tsx:1215–1240`.
3. **`appointments`** — all spay/neuter appointments plus **completed** vaccination appointments (`page.tsx:1337–1405`).
4. **Pet profile fallbacks** — if `pets.is_spayed_neutered` / `rabies_vaccinated` are true but no explicit record exists, a synthetic "verified" record is injected (`isVerifiedProfile: true`, IDs like `verified-kapon-<petId>`, `verified-vax-<petId>`) (`page.tsx:1407–1458`).

### Unified record shape (mobile DTO)

```ts
{
  id: string;
  type: "vaccination" | "consultation" | "spay-neuter";
  encounterNo: string;
  petName: string;
  petId?: string;
  species: string;
  breed: string;
  date: string;          // YYYY-MM-DD
  time: string;
  status: string;
  serviceType: string;
  chiefComplaint: string;
  diagnosis?: string;
  treatment?: string;
  medication?: string;
  vetName: string;
  photoUrl?: string;
  rawConsultation?: CVOConsultation;
  rawAppointment?: any;
  rawData?: any;
  isVerifiedProfile?: boolean;
}
```

- Dedup keys: `consultation-<id>`, `vaccination-<id>`, `spay-neuter-<aptId>`, `vax-apt-<aptId>`.
- Sorted newest date first (`date.localeCompare`).
- Filters: category (all / vaccination / consultation / spay-neuter) + selected pet (by ID **or** case-insensitive name), with per-category counts (`page.tsx:1464–1487`).

### Field derivation rules

- Consultation: `species`/`breed` prefer the registered pet, fallback to record values; breed defaults to `"Aspin (Mixed)"`.
- Vaccination record: `encounterNo = record_no` or `VAX-<id prefix>`; `treatment` folds together vaccine, batch number, and next due date; `status` defaults to `completed`; `time` defaults to `"Clinic Hours"`.
- Spay/neuter appointment: `encounterNo = KAPON-<id prefix>`; completed → `"Successfully Sterilized (Spayed / Neutered)"`, otherwise `"Scheduled for Kapon / Surgical Sterilization"`.
- Completed vaccination appointment: `encounterNo = VAX-<id prefix>`, diagnosis `"Vaccinated - Rabies Protection Active"`.
- Fallback profile records: dates can fall back to hardcoded `"2026-05-10"` / `"2027-05-10"`; time `"Annual"` or `"Permanent"`.

### Card UI (`page.tsx:2331–2699`)

Pet avatar, pet name, species/breed, `#encounterNo`, colored category badge (green = vaccination, indigo = spay/neuter, blue = consultation), status badge (`COMPLETED`, `OVERDUE`, `WAITING`, `IN CONSULTATION`, otherwise raw status uppercased), service type, date + time.

Expanding shows:
- "Chief Complaint / Reason" (or "Record Details" / "Surgical Notes" depending on type)
- diagnosis + attending vet + treatment (`"Immunization Status"`, `"Procedure Status"`, or `"Official Diagnosis"`; medication appended)
- Actions: **View Official CVO Paper** (consultations), **Appointment Slip** (appointments), **Official CVO Record** badge (vaccination records), **Delete** (unreviewed consultations only, blocked by vet 24-hour lock), **Print**.

Status vocabulary: `completed`, `overdue` (derived), `waiting`, `in-consultation`, `treatment`, `scheduled` (maps to DB `waiting`), `confirmed`, `missed`.

---

## 2. Scheduling tab — "Scheduled Transactions for Our Pets"

Also derived, from `appointments` + `consultations` + live `queue_tickets` (`page.tsx:1489–1645`):

- Only **today or future** dates; cancelled appointments excluded; missed kept and reclassified.
- Appointments and active consultations are merged into one list.
- A booking is marked **`unofficial`** until the pet checks in (matching queue ticket, or appointment status `checked-in`/`in-consultation`, or `checked_in_at`), completes, cancels, or is missed. Consultations similarly become `unofficial`, `waiting`, `overdue`, `completed`.
- Ticket matching is by `appointmentId`, `encounterNo`, or pet+owner name.
- Sort: date ascending, with ticketed items first on the same day.
- Filter chips: **Upcoming** (`unofficial`/`confirmed`/`waiting`/`checked-in`/`in-consultation`), **Missed** (`missed`/`overdue`), **Completed** (`completed`).

### Scheduled item shape (mobile DTO)

```ts
{
  id: string;
  kind: "appointment" | "consultation-queue";
  serviceId: string;
  serviceLabel: string;       // "Spay & Neuter Booking" | "Rabies Vaccination Booking" | "Clinical Consultation..."
  petName: string;
  petId?: string;
  species?: string;
  breed?: string;
  photoUrl?: string;
  date: string;
  timeSlot: string;
  location: string;           // "City Veterinary Office - Carmen Central Clinic"
  status: string;
  notes?: string;
  isMissed: boolean;
  isUnofficial: boolean;
  queueTicket?: string;       // e.g. "Q-001"
  rawAppointment?: any;
  rawConsultation?: any;
}
```

Status badge display: `UNOFFICIAL • SCAN QR TO QUEUE`, `IN QUEUE • #<ticket>`, `OVERDUE`, `WAITING`, `COMPLETED`, `CANCELLED`, or raw status uppercased. The header has **+ New Consultation** and **+ Schedule Procedure** buttons; cards expand for details/reschedule/cancel/slip actions.

### Booking flow (`schedule-procedure-dialog.tsx:688–934`)

1. Service: `vaccination` or `spay-neuter`; pick a registered pet; pick an available weekday date; accept pre-procedure checklist.
2. Validation:
   - Sign-in + registered pet required.
   - **Vaccination only bookable** if unvaccinated, overdue, or within **14 days before** the annual booster due date (`next_vaccination_date`, else `last_vaccination_date + 1 year`, else hardcoded `2027-05-10`) — see `src/lib/vaccination-rules.ts`.
   - No duplicate active booking for the same service/pet; **no same-day vaccination + spay/neuter** (anesthesia safety); already-sterilized pets can't book spay/neuter.
   - Weekdays only, past dates off, same-day only 08:00–17:00 local.
   - Capacity: default **10 vaccinations / 5 spay-neuter per day**, per-date overrides; config lives in a hidden `announcements` row titled `[CVO_PROCEDURE_QUOTA_CONFIG]`; cancelled bookings don't consume slots; today's checked-in/serving tickets do.
3. Writes on submit:
   - `appointments`: generated `id`, `owner_id`, `pet_id`, `pet_name`, `service_id`, `date`, `time_slot: "08:00 AM - 05:00 PM"`, `status: "confirmed"`, fixed location, notes with contact.
   - `service_transactions`: `transaction_type = "Vaccination Booking" | "Spay & Neuter Booking"`, `reference_id = appointment.id`, `status: "confirmed"`.
   - Browser local cache `syncvet_local_appointments` + query invalidation + `syncvet-appointment-updated` event.
4. Reschedule (`edit-appointment-dialog.tsx`) updates both tables and cancels/supersedes the old record. Cancel/delete (`page.tsx:866–983`) deletes or marks records cancelled, clears local cache, and removes queue tickets from `syncvet_clinic_queue_<YYYY-MM-DD>`.
5. Consultation requests (`pet-owner-consultation-dialog.tsx`) go to `consultations` with DB status `waiting` (UI calls it `scheduled`); extra form metadata is serialized into `veterinarian_notes` behind a `__CVO_FORM_META__:` marker. Requires weekday preferred date, complaint/symptoms, and blocks duplicate active request for the same pet.
6. Check-in: daily clinic QR (valid only on its date), opens at **08:00 AM**, closes after 17:00, issues `Q-001…` tickets in `queue_tickets` (source of truth for the live queue). Owner tracker (`pet-owner-queue-tracker.tsx`) shows now-serving / your turn / tickets ahead, with realtime updates and a chime. Field-operation attendance uses a separate `field-op` QR family and `opId`.

---

## 3. Relevant database tables

- `users`: `id`, `email`, `full_name`, `role`, contact, address, avatar, timestamps.
- `pets`: `id`, `owner_id`, `name`, `species`, `breed`, `birth_date`, `is_vaccinated`, `rabies_vaccinated`, `is_spayed_neutered`, `last_vaccination_date`, `next_vaccination_date`, `weight_category`, `photo_url`, notes.
- `appointments`: `id`, `owner_id`, `pet_id`, `pet_name`, `service_id`, `date`, `time_slot`, `status`, `location`, `notes`, timestamps. Statuses observed: `confirmed`, `checked-in`, `in-consultation`, `serving`, `completed`, `cancelled`, `missed`.
- `service_transactions`: `id`, `owner_id`, `transaction_no`, `transaction_type`, `title`, `detail`, `date`, `status`, `reference_id`.
- `consultations`: `id`, `encounter_no`, `pet_id`, `pet_name`, `species`, `breed`, `owner_id`, `owner_name`, `owner_contact`, `owner_barangay`, `vet_name`, `date`, `time`, `chief_complaint`, `symptoms[]`, vitals, `diagnosis`, `treatment`, `medication`, `dosage_instructions`, `follow_up_date`, `status`, `service_type`, `veterinarian_notes`.
- `vaccination_records`: `id`, `record_no`, `pet_id`, `pet_name`, `species`, `breed`, `owner_id`, `vaccine_name`, `batch_number`, `administered_date`, `next_due_date`, `veterinarian`, `barangay`, `status` (`complete`/`overdue`/`scheduled`).
- `queue_tickets`: `id`, `date`, `ticket_number`, `queue_sequence`, `appointment_id`, `encounter_no`, owner/pet identity, `service_id`, `service_title`, `status` (`waiting`/`in-consultation`/`completed`/`skipped`/`overdue`), `serving_vet`, `consultation_room`, check-in/call/complete timestamps, `checked_in_via`, `notes`.
- `field_operations`: `id`, `op_id`, `barangay`, `operation_type`, `scheduled_date`, `target_pets`, `vaccinated_pets`, `status`, notes.
- `announcements`: also stores the hidden quota config row.

---

## 4. Suggested mobile implementation plan

1. **DTOs:** define `Pet`, `Appointment`, `ServiceTransaction`, `Consultation`, `VaccinationRecord`, `QueueTicket`, `SlotConfig`, and derived `HistoryItem` / `ScheduledItem` from the shapes above. Normalize relations (Supabase joins may be object or array) and dates (`YYYY-MM-DD` for schedules, full ISO for audit).
2. **Screens:** History list (filter by type + pet, expandable detail, document/slip viewer), Scheduling list (Upcoming/Missed/Completed, detail + reschedule/cancel actions), Booking wizard (service → pet → date → checklist → confirm), Consultation request, Queue tracker + QR check-in.
3. **Data layer:** prefer an authenticated API layer (or Clerk-authenticated Supabase) over the web's public anon client. Subscribe to realtime on `appointments`, `consultations`, `vaccination_records`, `queue_tickets`, `announcements`.
4. **Port the business rules, not the cache:** 14-day vaccination window, weekday/slot capacity, duplicate/same-day conflicts, derived statuses, and dedup/fallback logic. Replace `localStorage` keys (`syncvet_local_appointments`, `syncvet_clinic_queue_<date>`, `syncvet_cvo_slot_configuration_v1`, etc.) with a local DB or server state.
5. **Do not copy the web's workarounds:** hard-coded emails/names/dates/vet/facility, and client-side ownership filtering. **RLS currently allows full CRUD to everyone** — ownership must be enforced server-side in the mobile backend. Generated `database.types.ts` is also stale (missing `queue_tickets`, `birth_year` vs `birth_date`), so define types from the actual migrations.

---

## Key takeaway

History is a **derived, deduplicated view** over consultations + vaccination records + appointments + pet profile flags. Scheduling is split across **appointments + service_transactions + queue_tickets**, with client-derived display states and several local caches. The canonical scheduling ID is `appointments.id`, and `service_transactions.reference_id` links the municipal record back to it.
