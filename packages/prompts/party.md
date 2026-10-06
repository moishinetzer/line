# Fixed prompt 1: Saturday, sorted

Create a beautiful, fully working party checklist app titled **Saturday, sorted**.
The group chat is "The Saturday Club". Subtitle: "A little party. Everyone brings
a little something." The fixed event is Saturday 10 October 2026, 5:00 pm,
at Maya's place. This is a hackathon demo date, not relative to today's date.

## Visual direction

Soft lavender background (#f1edf7), warm ivory cards, deep plum type (#42334f),
lime and butter-yellow accents. An expressive handmade cocktail, lemon and
strawberry illustration should make the hero feel like an invitation. Use a
large serif headline, small date/location chips, overlapping member avatars,
and a prominent completion summary. The item list is the centerpiece.

## Exact initial state and interactions

Use these four items in this order, Drinks initially bought, the other three not bought:

| ID | Item | Note | Owner |
| --- | --- | --- | --- |
| drinks | Something to sip | Drinks for 4 | Leo |
| snacks | The snack situation | Crisps, dips & something salty | Maya |
| ice | Ice, ice, baby | Two big bags should do it | Unclaimed |
| dessert | A sweet ending | Something to share | Unclaimed |

- Each row shows a small item illustration/emoji, name, note, owner and state.
- An unclaimed row has "I'll bring this". Clicking claims it for the selected
  member immediately. One owner per item. Show "You're bringing this" for self.
- Only the current owner may release an item or mark it bought. Other members
  see the owner and read-only state; they cannot steal or complete the item.
- An owner can toggle bought/undo. Releasing clears owner and bought state.
- Include an add-item field: trim the name, require 1–60 characters, create a
  new unclaimed row and clear the field. Enter and the add button both work.
- Show separate claimed and bought counts derived from real rows, including
  new items. Initial state is 2 of 4 claimed and 1 of 4 bought.
- Add a compact "Who's bringing what" summary derived from the same state.
- Save in localStorage key lines-party-v1. Do not require chat integration.

## Acceptance checks before finishing

As Ao, claim Ice: claimed becomes 3/4, Ice owner becomes Ao. Switch to Nina:
she cannot release or mark Ao's Ice bought. Switch back to Ao and mark it
bought: bought becomes 2/4. Release it: claimed 2/4, bought 1/4. Add "Napkins":
total becomes 5. Reload: items and ownership persist. Check phone layout.

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
