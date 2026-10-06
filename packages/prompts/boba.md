# Fixed prompt 3: The usual?

Create a beautiful, fully working group boba order board titled **The usual?**.
The group chat is "Boba break". Subtitle: "Your favourite people. Their favourite
drinks." This app collects choices and produces an order summary; it never
places or pays for an order.

## Visual direction

Soft berry pink (#f7e5ec), cream (#fffdf8) cards, raspberry (#aa3f69) controls,
matcha green, taro lavender, caramel and dark plum type (#472a42). Illustrate three appealing boba cups
with straws and pearls in SVG/CSS, each matching its drink. Use a large playful
serif headline, a horizontal trio of drink cards on desktop, comfortable stacked
cards on mobile, and a clear order summary. The result should feel like a small
independent tea shop, not an e-commerce catalog or generic form.

## Fixed menu and rules

Label "Demo menu selected by Lines". Do not say these are live Deliveroo prices
or that anything was fetched from Deliveroo. Exactly three drinks:

| ID | Name | Description | Price in pence |
| --- | --- | --- | --- |
| classic | Brown sugar | Milk tea · tapioca pearls | 550 |
| matcha | Matcha cloud | Matcha · oat milk | 590 |
| taro | Taro dream | Taro milk · tapioca pearls | 570 |

- Format prices in GBP: £5.50, £5.90, £5.70. Calculate every total using integer
  pence, including updated and removed orders; no floating-point accumulation.
- Exactly one drink per member. Sugar choices: 0%, 50%, 100%. Ice choices:
  No ice, Less ice, Regular. Default new form: Brown sugar, 50%, Less ice.
- Start empty: no orders for anyone, 0/4 responses and £0.00.
- "Add my drink" saves the selected member's order. If an order already exists,
  change the action to "Update my drink" and replace it instead of appending.
- On identity switch, populate the form from that member's stored order. For a
  member with no order, show the defaults. Editing one member never alters
  another member's order. Include "Remove my drink" only for an existing order.
- Summary shows each member, drink, sugar, ice and price; pending members;
  count of responses out of four; and the exact group total.
- "Copy order summary" copies a readable plain-text receipt with all drink
  details and total. On clipboard rejection, show the text for manual copying.
  Show confirmation only after successful copying. No checkout button.
- Save in localStorage key lines-boba-v1. Add a small "Collecting choices only;
  no order has been placed" note.

## Acceptance checks before finishing

Initial total £0.00 and 0/4 responses. Ao adds Brown sugar: £5.50, 1/4.
Maya adds Matcha cloud: £11.40, 2/4. Ao updates to Taro dream: £11.60, still 2/4.
Switch Maya: her saved matcha, sugar and ice appear in the form. Remove Ao's
order: £5.90, 1/4. Reload and
verify persistence. Verify receipt and clipboard fallback. Check phone layout.

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
