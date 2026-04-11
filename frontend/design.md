# Trilens — Design System & UI Specification

> Reference mockup screenshots are in `/frontend/img/`. Match every page pixel-for-pixel against them. This file governs every visual decision.

---

## 1. Design Philosophy

**Theme:** Clean, light, clinical, trustworthy. Think premium medical software — not consumer app.
- **No dark mode.** Light backgrounds only.
- **No decorative gradients** on text or cards.
- **Whitespace is intentional** — sections breathe, nothing is cramped.
- **Hierarchy through weight** — not through color noise.
- Every interactive element gets a smooth `300–500ms` `ease-out` transition.

---

## 2. Color Palette

| Token              | Hex       | Usage                                               |
|--------------------|-----------|-----------------------------------------------------|
| `brand`            | `#1A5C4A` | Logo, active nav, primary buttons, headings, accents |
| `bgPage`           | `#F0F4F8` | Page background                                     |
| `card`             | `#FFFFFF` | All cards, navbar, sidebar                          |
| `textDark`         | `#1A2B2B` | H1 headings, body text, labels                      |
| `textMuted`        | `#6B7280` | Subtitles, captions, helper text                    |
| `borderLight`      | `#D1D5DB` | Card borders, secondary button borders, dividers    |
| `brandLight`       | `#E6F0ED` | Icon backgrounds, soft accent fills                 |
| `purple`           | `#6B21A8` | Second condition bar, purple stats                  |
| `purpleLight`      | `#EDE9FE` | Purple icon backgrounds                             |
| `alert`            | `#DC2626` | Emergency escalations, error states                 |
| `alertLight`       | `#FEE2E2` | Alert backgrounds                                   |
| `amber`            | `#D97706` | Warning states (Clarity motion detected)            |
| `amberLight`       | `#FEF3C7` | Amber backgrounds                                   |
| `success`          | `#16A34A` | Success states, "Criteria Met" dot, progress        |
| `grey300`          | `#D1D5DB` | Third condition bar                                 |

**DO NOT** use any other colors. Every color in the UI maps to this table.

---

## 3. Typography

Font: **Inter** (Google Fonts). Import in `index.css`.

| Element                        | Weight | Size (desktop) | Color       | Notes                            |
|-------------------------------|--------|----------------|-------------|----------------------------------|
| Logo "Trilens"                | 700    | 20px           | `#1A5C4A`  | Top-left all pages               |
| H1 / Page titles              | 700    | 32–40px        | `#1A2B2B`  |                                  |
| Dashboard greeting            | 700    | 40px           | `#1A5C4A`  | "Good morning, Alex."            |
| Section headings              | 700    | 20–24px        | `#1A2B2B`  |                                  |
| Body text                     | 400    | 15px           | `#1A2B2B`  |                                  |
| Subtitles / descriptions      | 400    | 14px           | `#6B7280`  |                                  |
| Nav links                     | 500    | 14px           | `#6B7280`  | Active: 600 weight, `#1A5C4A`   |
| Uppercase micro-labels        | 600    | 11px           | `#6B7280`  | `letter-spacing: 0.08em`         |
| Stat numbers (Doctor dash)    | 700    | 40px           | varies     |                                  |
| Button text                   | 600    | 14px           | white / dark |                                 |
| Card sub-labels               | 500    | 12px           | `#6B7280`  |                                  |
| Badge / pill text             | 600    | 11px           | varies     | `letter-spacing: 0.05em`         |

---

## 4. Spacing System

Based on 4px base. Use Tailwind spacing utilities.

| Token   | px  | Tailwind class | Usage                         |
|---------|-----|----------------|-------------------------------|
| xs      | 4   | `p-1`          | Icon padding                  |
| sm      | 8   | `p-2`          | Tight inner padding           |
| md      | 16  | `p-4`          | Card inner padding default    |
| lg      | 24  | `p-6`          | Card inner padding large      |
| xl      | 32  | `p-8`          | Section gaps                  |
| 2xl     | 48  | `py-12`        | Hero padding, section padding |

**Section gap between major page sections:** `32px` (`gap-8` or `mb-8`).

---

## 5. Component Specs

### 5.1 Navbar
- Height: `64px`
- Background: `#FFFFFF`
- Border-bottom: `1px solid #E5E7EB`
- Box-shadow: `0 1px 3px rgba(0,0,0,0.06)`
- Logo: font-weight 700, `#1A5C4A`, `cursor-pointer`
- Nav links: `14px`, `500` weight, `#6B7280`. Active: `#1A5C4A`, `600` weight, underline via animated `::after` pseudo-element.
- Right icons: bell, gear — `#6B7280`, hover → `#1A2B2B`. Avatar: `40px` circle.
- Mobile: hamburger menu `≡` at `< md`, full nav hidden.

### 5.2 Cards
```css
background: #FFFFFF;
border-radius: 12px;     /* or 16px for larger cards */
box-shadow: 0 1px 3px rgba(0,0,0,0.08);
border: 1px solid #F3F4F6;
padding: 24px;           /* 32px for hero cards */
```
Hover (interactive cards only): `transform: translateY(-4px)` + `box-shadow: 0 8px 25px rgba(0,0,0,0.12)`. Transition: `300ms ease-out`.

### 5.3 Buttons

**Primary (brand):**
```css
background: #1A5C4A;
color: white;
border-radius: 8px;
padding: 12px 24px;
font-weight: 600;
font-size: 14px;
transition: all 300ms ease-out;
```
Hover: `box-shadow: 0 0 20px rgba(26,92,74,0.3)`, `transform: translateY(-1px)`.

**Secondary (outline):**
```css
background: white;
border: 1px solid #D1D5DB;
color: #374151;
border-radius: 8px;
padding: 12px 24px;
font-weight: 500;
```
Hover: `background: #F9FAFB`.

**Pill / tab buttons:**
```css
border-radius: 999px;
border: 1px solid #D1D5DB;
padding: 6px 16px;
font-size: 13px;
font-weight: 500;
```
Active pill: `background: #1A5C4A`, `color: white`, `border-color: #1A5C4A`.

**Disabled state:** `opacity: 0.45`, `cursor: not-allowed`, no hover effects.

### 5.4 Inputs
```css
background: #F3F4F6;   /* light grey fill */
border: 1px solid #E5E7EB;
border-radius: 10px;
padding: 14px 16px 14px 44px;  /* left padding for icon */
font-size: 14px;
color: #1A2B2B;
transition: border-color 300ms ease;
```
Focus: `border-color: #1A5C4A`, `outline: none`, `box-shadow: 0 0 0 3px rgba(26,92,74,0.08)`.
Icon inside: `#9CA3AF`, left-aligned, `16px`.

### 5.5 Role Selector Cards (Login/Register)
```css
border: 1.5px solid #E5E7EB;
border-radius: 12px;
padding: 20px;
cursor: pointer;
transition: all 250ms ease;
```
Selected: `border-color: #1A5C4A`, icon container background `#1A5C4A`, icon color white, label color `#1A5C4A` + `font-weight: 600`.
Unselected: icon container `#F3F4F6`, icon `#6B7280`.

### 5.6 Progress Bars (Conditions)
```css
height: 6px;
border-radius: 999px;
background: #E5E7EB;  /* track */
```
Fill — animated `width` transition `800ms ease-out`:
- Condition 1 (primary): `#1A5C4A` (brand green)
- Condition 2: `#7C3AED` (purple)
- Condition 3: `#D1D5DB` (grey)

### 5.7 Badges / Pills

**"ANALYSIS COMPLETE":** `background: #EDE9FE`, `color: #6B21A8`, `border-radius: 999px`, `font-size: 11px`, `font-weight: 600`, `letter-spacing: 0.05em`, `padding: 4px 12px`.

**"VERIFIED":** `background: #1A5C4A`, `color: white`, `font-size: 10px`.

**"STABLE":** `background: #DCFCE7`, `color: #16A34A`.

**"NEW REPORT AVAILABLE":** `background: #DC2626`, `color: white` — with pulsing `@keyframes pulse` dot.

**"CHECKUP PENDING":** `background: #F3F4F6`, `color: #6B7280`.

**Severity badges:**
- Mild: `#DCFCE7` bg, `#16A34A` text
- Moderate: `#FEF3C7` bg, `#D97706` text
- Severe: `#FEE2E2` bg, `#DC2626` text

### 5.8 Status Dots (Capture Quality / Doctor Queue)
- Green (good): `background: #16A34A`, `width: 14px`, `height: 14px`, `border-radius: 50%`, `box-shadow: 0 0 8px rgba(22,163,74,0.5)`
- Amber (warning): `background: #D97706`, same size, amber glow
- Red (error): `background: #DC2626`, same size, red glow

### 5.9 CircleGauge (SVG)
- Outer circle stroke: `#E5E7EB`, `stroke-width: 8`
- Progress stroke: `#1A5C4A`, `stroke-width: 8`, `stroke-linecap: round`
- Starts at 12 o'clock: `transform="rotate(-90 60 60)"`
- Percentage text: `22px`, `700` weight, `#1A2B2B`
- "CONFIDENCE" sub-label: `9px`, `#6B7280`
- Animate dasharray on mount: `transition: stroke-dasharray 1s ease`

### 5.10 Scan Tab Bar
- Background: `#FFFFFF`, `border-radius: 16px`, `padding: 8px`
- Each tab: icon + label, `60px` wide, `padding: 12px 20px`
- Active tab: `background: #F0F4F8`, icon + text `#1A5C4A`, `border-radius: 12px`
- Inactive: icon + text `#6B7280`
- Uploaded indicator: small green checkmark badge on tab icon

### 5.11 Doctor Sidebar (Doctor role only)
- Width: `210px`, fixed left
- Background: `#FFFFFF`
- Border-right: `1px solid #E5E7EB`
- Active item: `background: #F0F4F8`, left border `3px solid #1A5C4A`, text `#1A5C4A`
- Doctor info block: avatar circle (initials fallback), name `600` weight, subtitle `11px uppercase muted`

### 5.12 Table (Doctor Priority Queue)
- Header row: `background: #F9FAFB`, `font-size: 11px`, `font-weight: 600`, `#6B7280`, `letter-spacing: 0.08em`, `uppercase`
- Data row: `padding: 20px 16px`, `border-bottom: 1px solid #F3F4F6`
- Row hover: `background: #FAFAFA`
- Scan type badges: small pill, `background: #E6F0ED`, `color: #1A5C4A`, `font-size: 10px`

---

## 6. Icons

Use **Lucide React** throughout. Import only what's needed.

| Page/Component       | Icons used                                                      |
|---------------------|------------------------------------------------------------------|
| Navbar              | `Bell`, `Settings`, `User`                                      |
| Login               | `Mail`, `Lock`, `Eye`, `EyeOff`, `User`, `Stethoscope`, `Users`|
| Register            | same as login + `ShieldCheck`                                   |
| Dashboard           | `History`, `Download`, `Zap`, `Eye`, `Fingerprint`             |
| Scan                | `Upload`, `Eye`, `Globe`, `Bandage`, `Check`, `Info`           |
| Report              | `ShieldCheck`, `HelpCircle`, `Clock`, `AlertTriangle`          |
| Q&A                 | `ArrowLeft`, `ArrowRight`, `Info`, `CheckCircle`               |
| Final Report        | `Download`, `Stethoscope`, `AlertTriangle`, `Star`, `MapPin`  |
| Consultations       | `ShieldCheck`, `Lock`, `Video`                                  |
| Profile             | `User`, `FileText`, `Shield`, `Link`, `Eye`, `Fingerprint`, `LogOut` |
| Family              | `Plus`, `ChevronRight`                                         |
| Doctor Dashboard    | `AlertTriangle`, `BarChart2`, `Settings`, `Bell`, `Calendar`  |

---

## 7. Page-Specific Layout Rules

### Landing Page
- Full-width sections, centered content (`max-width: 1200px`, `margin: auto`)
- Hero card: `border-radius: 24px`, soft grey bg, animation placeholder centered
- Feature cards: 3-column grid, equal height, no shadow increase on hover (static cards)
- CTA block: soft rounded `border-radius: 24px` card, left text + right image

### Login / Register
- Page: centered card, `max-width: 560px`, `margin: 80px auto`
- Card: white, `border-radius: 24px`, `padding: 48px`, `box-shadow: 0 8px 40px rgba(0,0,0,0.1)`
- Role cards: 3 equal columns in a row, `gap: 12px`
- Bottom compliance bar: small icons + text, `#9CA3AF`, centered

### Dashboard
- Background: blurred clinical image hero (first 400px height)
- Content overlaid with `position: relative` container in white below
- Module cards: 3-column grid, lift on hover

### Scan Page
- Main area: left large card (~70% width), right quality panel (~28%)
- Upload card: `border: 2px dashed #D1D5DB`, `border-radius: 16px`
- After upload: dashed border → solid `#1A5C4A` border
- Tab bar: centered, `max-width: 400px`, bottom of main area

### Report Pages (Initial + Final)
- `max-width: 900px` on final report, centered
- Two-column layout on desktop (left: gauge + severity, right: pathologies)
- Doctor specialist cards: 3-column grid on desktop, 1-column on mobile

### Q&A Page
- Full-screen feel, minimal navbar
- Center content `max-width: 720px`
- Option cards: full-width, `border-radius: 16px`, clear hover + selected states
- Info panel: right side, `max-width: 300px`, `border-left: 3px solid #1A5C4A`

### Family Dashboard
- Teal gradient wash background: `linear-gradient(135deg, #C8E6DD 0%, #E0F0EC 100%)`
- Cards centered: 3-column, `max-width: 1100px`
- Member avatar border: `3px solid #1A5C4A` for stable, animated gradient for new report

### Doctor Dashboard
- Sidebar + main layout: `display: flex`, sidebar 210px fixed
- Stats cards: 3-column, large numbers
- Queue table: full-width, clear row separation

---

## 8. Animation Specifications

### Hover transitions (all interactive elements)
```css
transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### Card lift on hover
```css
.interactive-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}
```

### Button glow on hover
```css
.btn-primary:hover {
  box-shadow: 0 0 20px rgba(26,92,74,0.35);
  transform: translateY(-1px);
}
```

### Nav underline animation
```css
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px; left: 0; width: 100%; height: 2px;
  background: #1A5C4A;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-link.active::after, .nav-link:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}
```

### Scroll reveal (Intersection Observer)
```js
// Apply .reveal class to section containers
// On intersection: add .visible
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.5s ease, transform 0.5s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }
```

### Progress bar fill (Report pages)
Animate `width` from `0%` to actual value on mount:
```js
// Use useEffect + setTimeout to trigger CSS transition
setTimeout(() => setAnimated(true), 100);
// style={{ width: animated ? `${value}%` : '0%', transition: 'width 0.8s ease-out' }}
```

### CircleGauge stroke animation
Animate `stroke-dasharray` on mount: start at `0 circumference` → `value circumference`.

### Pulsing emergency dot (Doctor dashboard)
```css
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
}
.emergency-dot { animation: pulse-red 1.5s infinite; }
```

### Loading spinner
```css
@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
```

---

## 9. Mobile Responsiveness Rules

### Breakpoints (Tailwind defaults)
- `sm`: 640px — compact cards
- `md`: 768px — navbar collapse threshold
- `lg`: 1024px — 3-column grids
- `xl`: 1280px — max content width

### Rules per breakpoint

**< md (mobile):**
- Navbar: hamburger icon, full-screen overlay menu on open
- 3-column grids → 1-column (`grid-cols-1`)
- Doctor sidebar → hidden, toggle button bottom-right
- Scan tab bar → sticky bottom, full-width
- Role selector cards → full-width column stack
- Section padding: `px-4 py-6`
- All font sizes: reduce H1 to `text-2xl`, greeting to `text-3xl`

**md → lg (tablet):**
- 3-column grids → 2-column (`grid-cols-2`)
- Doctor sidebar → collapses to icon-only (40px)

**≥ lg (desktop):**
- Full 3-column layouts
- Doctor sidebar: full 210px

### Tap targets
Minimum `44px × 44px` for all clickable elements. Add `min-h-[44px]` and `min-w-[44px]` where needed.

---

## 10. Accessibility Notes

- All inputs have `<label>` tags with `htmlFor`
- All icon-only buttons have `aria-label`
- Color is never the only indicator (always paired with icon/text)
- Focus rings: `focus:ring-2 focus:ring-brand focus:ring-offset-2`
- Loading states: `aria-busy="true"` on buttons during async calls
- Error messages: `role="alert"` on toast notifications

---

## 11. Key Copywriting (Match Exactly)

| Element                | Exact text                                                    |
|------------------------|---------------------------------------------------------------|
| Login title            | "Welcome Back"                                                |
| Login subtitle         | "Enter the Clinical Sanctuary"                                |
| Register title         | "Create Clinical Account"                                     |
| Register subtitle      | "Initialize your secure medical environment"                  |
| Login button           | "Sign in as {Role} →"                                        |
| Register button        | "CREATE MY CLINICAL ACCOUNT 🛡"                              |
| Compliance bar         | "HIPAA COMPLIANT · 256-BIT AES · GDPR PROTECTED"            |
| Upload heading         | "Ready for Analysis"                                          |
| Upload subtext         | "Select a high-resolution diagnostic image to begin ML extraction" |
| Accepted formats       | "ACCEPTED FORMATS: DICOM, TIFF, JPEG (8K)"                  |
| Scan tip               | "Hold device steady. The subject should look directly at the teal dot." |
| Analyze button         | "ANALYZE"                                                     |
| Q&A CTA heading        | "Refine Diagnostic Accuracy"                                  |
| Q&A CTA button         | "Start Clinical Q&A →"                                       |
| Q&A duration           | "⏱ APPROX. 2 MINUTES"                                        |
| Family page title      | "Family Wellness Dashboard"                                   |
| Family subtitle        | "Select a family member to review clinical records and wellness insights." |
| Enroll button          | "+ ENROLL NEW FAMILY MEMBER"                                 |
| Doctor dash title      | "Patient Bookings"                                            |
| Doctor dash subtitle   | "Review clinical biomarkers and validate incoming scan requests." |
| Download button        | "↓ Download PDF Report"                                      |
| Sign out button        | "SIGN OUT"                                                    |
| Security label         | "SECURITY LEVEL: GRADE-A AES-256"                            |
| Disclaimer             | "Trilens is a diagnostic support tool and does not provide clinical diagnoses." |
| Copyright              | "© 2024 TRILENS CLINICAL SYSTEMS. MEDICAL DIAGNOSTIC USE ONLY." |

---

## 12. What NOT To Do (Hard Rules)

- ❌ No gradients on text
- ❌ No dark backgrounds on any page
- ❌ No mock/hardcoded data — every value comes from API
- ❌ No random color usage outside the palette
- ❌ No serif fonts
- ❌ No card borders stronger than `1px solid #E5E7EB`
- ❌ No animations faster than 200ms or slower than 600ms
- ❌ No inline styles where Tailwind classes exist
- ❌ No placeholder images (use initials fallback for avatars)
- ❌ No `!important` in CSS
- ❌ No backend files touched
