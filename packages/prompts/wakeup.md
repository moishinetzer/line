# Fixed prompt 2: Rise together

Create a beautiful, fully working morning check-in app titled **Rise together**.
The group chat is "Early birds". Subtitle: "One small promise. A brighter start,
together." The group aims to check in by **7:30 am Europe/London** every day.

## Visual direction

Warm sunrise cream (#fff8e7), butter yellow (#f6d76b), peach, and deep brown
text (#493e30). Include a friendly sunrise illustration with rays/clouds. The
hero's large "I'm up" button is the focal point. A compact set of four member
cards shows today's progress, followed by an elegant seven-day leaderboard.
Use warm editorial typography, rounded cards and lots of breathing room.

## Exact rules and state

- Members are Ao, Maya, Leo, Nina. Default current member Ao.
- Display today's London date and London clock; use Intl with the IANA zone
  Europe/London, correctly handling British Summer Time. Do not hardcode UTC+1.
- "I'm up" records the current timestamp for that member on that London date.
  Allow exactly one check-in per member per London date. Disable the button
  after success and show "You're up" plus their recorded London time.
- On time means at or before 07:30:00 London time: 1 point. Any later check-in
  earns 0 points and says "Still showed up". No check-in earns 0. Explicitly label
  the rule. Never award points for repeated clicks, reloads or identity switches.
- The leaderboard covers today and the previous six London calendar dates.
  Show name, points, days checked in and rank. Sort by points descending, then
  name ascending for deterministic display. Equal points share the same rank. Do not pretend late is on time.
- Seed only the previous six dates once, never today. Offsets -6 through -1:
  Maya on time on all six; Nina on time at -6,-5,-4,-3,-2 and late at -1;
  Leo on time at -6,-4,-2 and late at -5,-3, absent at -1;
  Ao on time at -6,-5,-4,-3,-1 and late at -2.
  Use representative 07:15 local times for on-time and 08:10 for late.
- Show a small "Example history" label on seeded history. Date rollover creates
  an empty today; don't move old check-ins or continuously reseed history.
- Save in localStorage key lines-rise-together-v1. No geolocation, notifications,
  health claims, alarms, authentication or external data service.

## Acceptance checks before finishing

Check in as Ao once; repeat click and reload must not duplicate points. Switch
to Maya and check in; preserve Ao's entry. Verify cutoff at 07:30:00 vs 07:30:01
in both winter GMT and summer BST. Verify London midnight when browser uses a
different timezone. Verify window excludes entries older than six days and
the four-member ranking is derived from records. Check phone layout.

## Shared requirements (fixed for this hackathon)

Build the working application now, not just a plan or wireframe. Use Lovable's
normal React + TypeScript stack. This is a standalone demo with local browser
state. Do not add auth, Supabase, payments, delivery services, analytics, or any
external backend. Do not claim edits sync across different people/devices.
Use a visible, compact "Demo · viewing as" selector for exactly these members:
Ao (ao), Maya (maya), Leo (leo), Nina (nina); default Ao. Switching the selector
changes the acting member. It is demo identity, not authentication.

The agent/brand is **Lines**. The concept is a group agent that brings people
together. Use the lowercase wordmark "lines" and this exact mark at 28–36px,
with a small footer "Made for your group by Lines". Three soft blue, lime and
pink characters stand side by side. No connecting strokes, arms, or holding
hands. Never substitute the Dots or OpenAI logo. Inline the SVG below:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="50" fill="#202620"/>
  <path d="M12.5 49C12 38 18.5 31.5 26 31.5C34.5 31.5 38 38.5 35 49.5L32.5 66Q31.5 74 25.5 74H18.5Q12 74 12.5 65Z" fill="#64B5F6"/>
  <path d="M40.5 40C40.5 29.5 44.5 23 51 23S62 29.5 62 40V66Q62 74 55 74H47.5Q40.5 74 40.5 66Z" fill="#BEE478"/>
  <path d="M68 48Q66 32.5 78 32.5Q91 32.5 88.5 49L87.5 65.5Q87.5 74 80.5 74H74.5Q68 74 68 66Z" fill="#F48ECC"/>
  <g fill="#202620">
    <ellipse cx="23" cy="47.5" rx="1.65" ry="2.65"/>
    <ellipse cx="30" cy="46.5" rx="1.65" ry="2.65"/>
    <ellipse cx="47" cy="39.5" rx="1.7" ry="2.7"/>
    <ellipse cx="55" cy="39.5" rx="1.7" ry="2.7"/>
    <ellipse cx="73" cy="46.5" rx="1.65" ry="2.65"/>
    <ellipse cx="80" cy="47.5" rx="1.65" ry="2.65"/>
  </g>
</svg>
```

Design a finished, warm, editorial mobile-first product. Use DM Sans for UI and
DM Serif Display for the main heading, with sensible local/system fallbacks.
Use generous whitespace, a distinctive illustration drawn in SVG/CSS, a clear
hierarchy, soft rounded surfaces, thin quiet borders and restrained shadows.
Keep the main actions visible and usable on a 390px-wide phone. On a desktop,
use a centered composition with a maximum width around 1000px. No horizontal
overflow, generic analytics dashboard, hero stock photos, or unrelated sidebar.
Provide visible keyboard focus, real button semantics, accessible labels,
readable contrast and comfortable touch targets. Honour reduced motion.

Persist only this app's data in a versioned localStorage key. Handle missing,
invalid or unavailable storage gracefully. Seed once; never overwrite user
changes on reload. Show a small "Demo data · saved in this browser" note.
Do not generate placeholder controls: every visible primary control must work.
Display honest success/error states. No actual purchase, delivery or payment.
Do not silently change the fixed names, rules, prices or content below.

If Lovable requires a human decision to move from plan to build, pause at its
approval mechanism and show the concrete plan. Never assume approval, bypass
an approval by sending a new message, or create a replacement project.
A plan is not a completed app. When approved, implement this same project.
