Act as a senior mobile product designer and senior React Native/Expo developer with extensive experience building polished, production-ready healthcare, veterinary, and government service applications.

Design and build the initial experience for a mobile application called “SyncVet” — a digital veterinary service platform for our City Veterinary Office. SyncVet allows residents and pet owners to conveniently access veterinary services online instead of having to visit the veterinary office just to register or schedule a service.

The platform will eventually support services such as:
- Veterinary consultation registration
- Pet vaccination registration and scheduling
- Spay and neuter registration
- Pet health-related services
- Veterinary appointments
- Service requests and registrations
- Appointment/status tracking
- Notifications and reminders
- Other services offered by the City Veterinary Office

For this first development phase, DO NOT build the entire application yet. Focus heavily on creating an exceptional first impression through the landing, onboarding, welcome, and authentication experience.

## PRODUCT GOAL

SyncVet should feel like a modern, trustworthy, approachable, and community-oriented veterinary service application. It should communicate:

“Your pet’s care, connected to your city.”

The experience should feel official enough for a City Veterinary Office while still being warm, friendly, and visually appealing to everyday pet owners.

Avoid making it look like a generic government application. Avoid overly corporate layouts, outdated government UI patterns, excessive forms, or visually boring screens.

The design should feel comparable to a professionally designed modern mobile application.

## INITIAL APP FLOW

Create the following initial flow:

1. Splash Screen
2. Welcome / Landing Screen
3. Onboarding Screen 1 — Discover Services
4. Onboarding Screen 2 — Register Easily
5. Onboarding Screen 3 — Stay Updated
6. Authentication Selection
7. Sign In
8. Create Account
9. Forgot Password
10. Basic successful authentication transition into the main application

The onboarding should be skippable, with the user's preference persisted so the onboarding does not repeatedly appear every time the app launches.

## SPLASH SCREEN

Create a short, polished splash experience featuring:

- SyncVet logo
- Simple veterinary/pet-inspired visual identity
- Clean background
- Subtle animation
- Small loading/progress treatment if appropriate
- Smooth transition into the welcome screen

The animation should be quick and professional rather than distracting.

Example animation ideas:
- Logo gently scales/fades in
- Small veterinary/paw element subtly moves into position
- Logo elements animate sequentially
- Background elements have extremely subtle motion

Keep the animation around 1–2 seconds.

## WELCOME / LANDING SCREEN

Create a visually impressive mobile landing screen.

The screen should immediately communicate what SyncVet does.

Include:

- SyncVet logo/name
- Strong headline such as:
  “Better Care for Your Best Friend.”
- Supporting text explaining that residents can register for veterinary services through their city veterinary office
- Primary CTA: “Get Started”
- Secondary CTA: “Sign In”
- Friendly veterinary/pet illustration or visual
- Subtle background elements related to pets/veterinary care

The composition should prioritize visual hierarchy and make the primary CTA immediately obvious.

Use tasteful animation when the page loads.

For example:
- Illustration gently floats
- Decorative paw prints subtly appear
- Headline fades/slides upward
- CTA buttons have a subtle entrance animation
- Background shapes move very slightly

Do not over-animate the page.

## ONBOARDING

Design a 3-step onboarding experience.

### Onboarding 1 — Discover Services

Message:
“Veterinary Services, Made Simple.”

Explain that users can conveniently access available veterinary services from their mobile device.

Visual:
A friendly pet/veterinary illustration.

### Onboarding 2 — Register Easily

Message:
“Register Without the Long Wait.”

Explain that users can submit registrations for consultations, vaccinations, spay/neuter procedures, and other services online.

Visual:
Mobile appointment/registration concept.

### Onboarding 3 — Stay Updated

Message:
“Stay Updated on Your Pet’s Care.”

Explain that users can receive appointment updates, reminders, and important notifications.

Visual:
Notification/appointment concept.

Include:

- Progress indicators
- Back button
- Skip button
- Next button
- Final “Get Started” button
- Smooth horizontal page transitions

Use subtle parallax or movement where appropriate, but maintain excellent performance.

## AUTHENTICATION EXPERIENCE

After onboarding, create a polished authentication entry screen.

The authentication screen should not immediately overwhelm users with a large form.

Instead, create a friendly authentication choice:

“Welcome to SyncVet”

“Access veterinary services from your city, all in one place.”

Buttons:

- Sign In
- Create an Account

Optionally include:

- Continue with Google, ONLY if authentication infrastructure supports it
- Privacy Policy
- Terms of Service

Do not add unnecessary authentication methods just for visual purposes.

## SIGN-IN SCREEN

Create a modern mobile sign-in interface with:

- Email address
- Password
- Password visibility toggle
- Forgot Password
- Sign In button
- Create Account link

Include strong validation and useful error states.

Examples:

- Invalid email
- Incorrect credentials
- Empty fields
- Network error
- Loading state

Do not use browser alert dialogs for validation. Use proper inline mobile UI feedback.

## CREATE ACCOUNT SCREEN

Create a clean registration flow.

Initially collect only the information necessary for account creation.

Potential fields:

- Full Name
- Email Address
- Mobile Number
- Password
- Confirm Password

Do not make the registration screen unnecessarily long.

If additional information is required later, create a separate profile-completion step after registration.

Include:

- Password strength feedback
- Password visibility toggle
- Field validation
- Loading state
- Error states
- Success state

## VISUAL DESIGN

Use a modern veterinary-inspired visual language.

The aesthetic should combine:

- Modern healthcare UI
- Friendly pet-care visuals
- Civic/public-service credibility
- Soft rounded surfaces
- Clean typography
- Generous spacing
- Accessible contrast
- Modern cards
- Subtle depth
- Minimal visual clutter

Use a cohesive design system rather than randomly styling individual screens.

Recommended characteristics:

- Rounded cards and buttons
- Large readable typography
- Soft surfaces
- Clear CTA hierarchy
- Friendly illustrations
- Consistent iconography
- Comfortable touch targets
- Responsive layouts

Do not make the UI childish or overly cartoonish.

It should appeal to teenagers, adults, families, and older residents.

## COLOR SYSTEM

Create a professional veterinary color palette.

Use a primary color associated with trust, health, and freshness, such as a modern teal/green or blue-green.

Complement it with:

- Soft neutral backgrounds
- White surfaces
- Dark readable text
- A warm accent color for important actions
- Semantic colors for success, warning, and error states

Define colors as reusable theme tokens rather than hardcoding colors throughout the application.

## ANIMATION SYSTEM

Animation is an important part of the SyncVet experience.

Create a reusable animation system using appropriate React Native animation technology.

Animations should include:

- Screen entrance animations
- Fade + slide transitions
- Button press feedback
- Floating illustration animations
- Onboarding page transitions
- Loading animations
- Success animations
- Form validation feedback
- Authentication transition animations

Animations should be:

- Fast
- Smooth
- Purposeful
- Subtle
- Consistent

Avoid excessive bouncing, spinning, flashing, or gimmicky animations.

Respect reduced-motion accessibility preferences where possible.

## MOBILE UX

Design specifically for mobile devices.

Prioritize:

- One-handed usability
- Large touch targets
- Safe areas
- Keyboard handling
- Different screen sizes
- Accessibility
- Clear navigation
- Proper loading states
- Offline/network error states

Do not simply shrink a desktop website into a mobile screen.

## TECHNICAL REQUIREMENTS

Use:

- React Native
- Expo
- TypeScript
- Expo Router
- Modern React architecture
- React Native Reanimated for performant animations
- React Native Gesture Handler where appropriate
- Secure authentication architecture
- Reusable components
- Centralized theme/design tokens

Structure the project professionally.

Use a scalable folder structure such as:

app/
components/
features/
hooks/
lib/
services/
store/
theme/
types/
assets/

Separate UI components from business logic and API/authentication logic.

Avoid putting everything into a single component.

## COMPONENT ARCHITECTURE

Create reusable components such as:

- Button
- Input
- PasswordInput
- SocialAuthButton
- Logo
- PetIllustration
- OnboardingSlide
- ProgressIndicator
- AnimatedScreen
- LoadingState
- ErrorMessage
- SuccessMessage
- ServiceCard
- AuthHeader

Components should be reusable throughout the future application.

## ACCESSIBILITY

Follow mobile accessibility best practices.

Ensure:

- Proper text contrast
- Accessible labels
- Sufficient touch target sizes
- Screen-reader-friendly controls
- Clear error messages
- Logical focus order
- Reduced-motion consideration
- Readable typography

## UX DETAILS

Pay attention to micro-interactions.

For example:

When the user presses “Get Started”:
→ button provides subtle feedback
→ screen transitions smoothly
→ authentication screen enters naturally

When a form is submitted:
→ button changes to loading state
→ prevent duplicate submission
→ show success/error feedback
→ transition only after successful completion

When an error occurs:
→ clearly identify the problematic field
→ provide a human-readable explanation
→ avoid technical error messages

## IMPORTANT DEVELOPMENT RULES

Do NOT generate a fake-looking prototype with everything hardcoded into one file.

Build the foundation as if this application will eventually become a production application used by an actual City Veterinary Office.

Do not implement the complete veterinary-service backend yet.

Instead, create clean service/API abstraction points so backend integration can be added later.

Use mock data only where necessary.

Do not over-engineer features that are not part of this phase.

Focus on making the first-run experience extremely polished.

## DESIGN QUALITY BAR

The final result should feel like it was designed and developed by a senior product team.

Think:

“Modern veterinary healthcare app + polished civic service platform + premium mobile UX.”

It should NOT feel like:

- A school project template
- A generic CRUD application
- A basic login form
- A government website converted into an app
- A template with random animations

Prioritize:

1. Excellent first impression
2. Strong visual hierarchy
3. Smooth interactions
4. Clear user flow
5. Accessibility
6. Performance
7. Maintainable architecture
8. Consistent design system
9. Production-ready code quality

Build the splash, welcome, onboarding, authentication selection, sign-in, registration, and forgot-password flows first.

Make every screen feel connected to the same SyncVet visual identity.

After implementing the initial experience, verify navigation, animations, keyboard behavior, validation, loading states, and responsiveness across common mobile screen sizes.