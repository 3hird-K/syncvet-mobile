Act as a senior mobile UI/UX designer and senior React Native/Expo developer.

IMPORTANT: This is an EXISTING SyncVet mobile application. Do not rebuild the project from scratch, do not replace the existing architecture unnecessarily, and do not create a separate prototype.

Your task is to REDESIGN AND IMPROVE the existing application.

SyncVet is a mobile service platform for our City Veterinary Office. It allows residents/pet owners to access veterinary services online, including consultations, vaccinations, spay/neuter services, registrations, appointments, and other veterinary services.

The existing project, navigation, backend, components, and functionality are already implemented.

Your job is to improve the existing UI/UX and continue the experience from authentication into the main application.

==================================================
PHASE 1 — REDESIGN EXISTING AUTH PAGES
==================================================

First inspect the existing authentication/onboarding pages and preserve their existing functionality.

Do NOT create an entirely new authentication architecture.

Redesign the existing auth experience to make it:

- Modern
- Clean
- Friendly
- Professional
- Premium
- Mobile-first
- Appropriate for a City Veterinary Office

The current authentication experience should be simplified.

REMOVE the traditional registration experience where possible.

The preferred authentication flow is:

Splash
→ Welcome
→ Continue with Google
→ Existing user/profile check
→ Owner/Pet registration if required
→ Main App

The primary authentication action should be:

“Continue with Google”

Do not make users manually create passwords if Google authentication is already supported by the existing backend.

Do not introduce unnecessary authentication fields.

Keep the existing Google/Supabase authentication implementation if it already exists.

==================================================
AUTH LANDING PAGE
==================================================

Redesign the existing authentication landing page rather than creating a new page.

Create a strong first impression.

Possible layout:

SyncVet logo

“Better care for your best friend.”

“Access veterinary services from your City Veterinary Office, right from your phone.”

Large friendly pet/veterinary visual.

Primary CTA:

Continue with Google

Secondary text:

“By continuing, you agree to our Terms and Privacy Policy.”

Keep the page visually spacious.

Use subtle animation when the page loads:

- Logo fade/scale
- Illustration floating slightly
- Text appearing with a short upward motion
- CTA appearing smoothly

Do not over-animate.

The page should feel polished within the first 2 seconds.

==================================================
EXISTING OWNER/PET REGISTRATION
==================================================

Keep the existing owner and pet registration functionality if it already exists.

Do not unnecessarily redesign the underlying logic.

Instead, improve the UI/UX.

Make the registration feel conversational and simple.

Instead of presenting a huge form, use clear sections and progressive disclosure.

For example:

“Tell us about yourself”

then:

“Now, tell us about your pet.”

Use the existing fields/data requirements from the project.

Do not invent unnecessary information.

Improve:

- Input styling
- Validation
- Keyboard behavior
- Spacing
- Button states
- Loading states
- Error states
- Success states
- Transitions

If the user has already completed registration, SKIP these pages and take them directly to the main application.

==================================================
AUTH TRANSITIONS
==================================================

Make the transition from authentication to the main app feel intentional.

For example:

Google authentication succeeds
↓
Profile check
↓
If incomplete → existing owner/pet registration
↓
Registration completed
↓
Short success animation
↓
Home

Returning user:

Google/session detected
↓
Profile check
↓
Home

Do not force returning users through onboarding or registration again.

==================================================
PHASE 2 — REDESIGN THE EXISTING MAIN APP
==================================================

After the authentication redesign is complete, move directly into redesigning the existing pages inside the application.

IMPORTANT:

Use the EXISTING screens, routes, functionality, API calls, database integration, and components wherever possible.

Do not remove working functionality simply to make the UI look different.

Improve the existing UI rather than rebuilding the entire application.

==================================================
MAIN HOME PAGE
==================================================

Redesign the existing home/dashboard page into a modern veterinary-service dashboard.

The home screen should immediately answer:

“What can I do for my pet today?”

Create a personalized header.

Example:

“Good morning, Neil 👋”

“Here’s what’s happening with your pets.”

Show:

- User profile/avatar
- Notification button

Then create a PET section.

Example:

“My Pets”

[ Milo 🐕 ] [ Luna 🐈 ] [ + Add Pet ]

Make the pet cards visually attractive and interactive.

Each pet card can display:

Pet photo
Pet name
Breed
Age

==================================================
QUICK SERVICES
==================================================

Create a prominent “Services” section.

Show the most important services as attractive cards:

Consultation
Vaccination
Spay & Neuter
Pet Registration
Other Services

Each card should have:

- Appropriate icon/illustration
- Service name
- Short supporting text if necessary

Make the cards easy to scan.

Do not overcrowd the home screen.

==================================================
UPCOMING APPOINTMENT
==================================================

Create a prominent upcoming appointment section.

Example:

Upcoming Appointment

Milo
Vaccination

August 20
9:30 AM

City Veterinary Office

[View Details]

If there is no appointment:

“No upcoming appointments”

[Book a Service]

Make this an intentional empty state rather than simply leaving an empty card.

==================================================
RECENT ACTIVITY
==================================================

Use the existing registration/service data to display recent activity.

Examples:

✓ Vaccination registration submitted
✓ Consultation confirmed
✓ Spay/neuter request received
✓ Appointment completed

Use a modern activity/timeline component instead of a traditional table.

==================================================
MAIN NAVIGATION
==================================================

Redesign the existing navigation while preserving the current routing.

Use a modern bottom tab bar.

Recommended structure:

Home
Services
Pets
Appointments
Profile

Use clean icons and labels.

The active state should be obvious but subtle.

Add a small transition when changing tabs.

Do not use excessive animations.

==================================================
SERVICES PAGE
==================================================

Redesign the existing services page.

Header:

“Veterinary Services”

“Find the care your pet needs.”

Use modern service cards.

Existing services should remain functional.

Examples:

Consultation
Vaccination
Spay & Neuter
Deworming
Pet Registration
Other City Veterinary Services

When a service is selected, preserve the existing registration functionality.

Improve the visual flow:

Service
→ Pet
→ Details
→ Schedule
→ Review
→ Submit

Do not change backend behavior unless necessary.

==================================================
PETS PAGE
==================================================

Redesign the existing pet management page.

Display pets using visually rich cards.

Each pet should show:

Photo
Name
Species
Breed
Age

Actions:

View Profile
Edit
Veterinary Information

Make “Add Pet” easy to find.

==================================================
PET PROFILE PAGE
==================================================

Improve the existing pet detail screen.

Use sections such as:

Overview
Veterinary Information
Vaccination History
Appointments
Service History

Use cards, timelines, badges, and clear hierarchy.

Avoid spreadsheet-like layouts.

The page should feel like a digital health profile for the pet.

==================================================
APPOINTMENTS PAGE
==================================================

Redesign the existing appointment page.

Use:

Upcoming
Past

Each appointment should clearly show:

Pet
Service
Date
Time
Location
Status

Statuses:

Pending
Confirmed
Completed
Cancelled

Use appropriate visual status indicators.

==================================================
PROFILE PAGE
==================================================

Redesign the existing user profile page.

Include:

Profile information
Email
Mobile number
Address

Settings:

Notifications
Privacy
Help & Support
About SyncVet

Authentication:

Sign Out

Do not add unnecessary password-management functionality if Google authentication is being used.

==================================================
DESIGN LANGUAGE
==================================================

Create ONE consistent design system across both authentication and the main application.

The app should feel like one cohesive product.

Design characteristics:

- Modern
- Warm
- Trustworthy
- Clean
- Professional
- Friendly
- Accessible

Think:

Premium veterinary mobile application
+
Modern civic service application.

Avoid making it look like:

- A generic government website
- A basic CRUD application
- A school project
- A template dashboard
- A childish pet game

==================================================
COLOR & VISUAL SYSTEM
==================================================

Use a professional veterinary-inspired palette.

Prefer:

- Modern teal / blue-green as the primary color
- Soft neutral backgrounds
- White surfaces
- Dark readable text
- Subtle accent colors

Do not make every element green.

Use color primarily to establish hierarchy and meaning.

Create reusable theme tokens for:

Colors
Typography
Spacing
Radius
Shadows
Component states

==================================================
ANIMATION
==================================================

Use the existing animation system if one already exists.

If appropriate, use React Native Reanimated.

Animations should be:

- Smooth
- Short
- Purposeful
- Performance-friendly

Implement subtle animations for:

Screen transitions
Cards
Buttons
Service selection
Pet selection
Loading
Success states
Navigation

Example:

When a user selects a service:

Card subtly scales
→ transition to service details

When registration succeeds:

Loading button
→ success state
→ subtle confirmation animation
→ appointment/registration details

Do not animate every element.

Avoid excessive bouncing or gimmicky effects.

==================================================
IMPORTANT: PRESERVE EXISTING FUNCTIONALITY
==================================================

This is an EXISTING APPLICATION.

Before modifying anything:

1. Inspect the existing project.
2. Identify the current authentication flow.
3. Identify existing routes.
4. Identify existing screens.
5. Identify existing reusable components.
6. Identify existing Supabase/backend integration.
7. Identify existing database models.
8. Identify existing service registration functionality.

Then redesign the UI around the existing functionality.

Do NOT:

- Delete working features
- Replace the backend unnecessarily
- Rewrite working API logic
- Create duplicate routes
- Create duplicate authentication systems
- Hardcode fake data when real project data already exists
- Create a completely separate demo app

Reuse existing functionality wherever possible.

==================================================
RESPONSIVE MOBILE UX
==================================================

Make the redesigned pages work properly across common mobile screen sizes.

Handle:

- Safe areas
- Small screens
- Large screens
- Keyboard appearance
- Scrolling
- Long pet names
- Long service names
- Dynamic content
- Loading states
- Empty states
- Error states

Use accessible touch targets.

==================================================
FINAL DEVELOPMENT APPROACH
==================================================

Do this in TWO stages.

STAGE 1:

Redesign ONLY the existing authentication/onboarding pages.

Verify:

Google authentication
Profile detection
Owner registration
Pet registration
Returning users
Loading states
Error states
Navigation

STAGE 2:

After the auth flow is polished, redesign the existing main application pages.

Start with:

Home
→ Services
→ Pets
→ Appointments
→ Profile

Preserve the existing backend and functionality.

The final result should feel like the existing SyncVet application has received a professional product redesign by a senior mobile engineering and design team.

Focus on QUALITY over adding unnecessary features.

Do not simply make the UI colorful.

Improve hierarchy, spacing, interaction design, information architecture, animations, accessibility, and overall usability.

Make SyncVet feel like a real application that residents would confidently use to access their City Veterinary Office.