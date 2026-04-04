# DILOS — Car Showroom Sales Intelligence Platform
### App Specification & Design Document · v1.0

---

## Table of Contents

1. [Vision & Concept](#1-vision--concept)
2. [Design Philosophy & System](#2-design-philosophy--system)
3. [App Architecture & Navigation](#3-app-architecture--navigation)
4. [Screen Specifications](#4-screen-specifications)
   - 4.1 [Splash & Onboarding](#41-splash--onboarding)
   - 4.2 [Home Dashboard](#42-home-dashboard)
   - 4.3 [Product Catalog & Brochures](#43-product-catalog--brochures)
   - 4.4 [AI Objection Handler](#44-ai-objection-handler)
   - 4.5 [Product Highlights & 3D Studio](#45-product-highlights--3d-studio)
   - 4.6 [Head Office Communications](#46-head-office-communications)
   - 4.7 [AI Avatar Pitch Practice](#47-ai-avatar-pitch-practice)
5. [Animation & Motion System](#5-animation--motion-system)
6. [Component Library](#6-component-library)
7. [Data Models & API Contracts](#7-data-models--api-contracts)
8. [Technical Architecture](#8-technical-architecture)
9. [AI & Intelligence Layer](#9-ai--intelligence-layer)
10. [3D Model System](#10-3d-model-system)
11. [Permissions & Access Control](#11-permissions--access-control)
12. [Notifications System](#12-notifications-system)
13. [Offline Capability](#13-offline-capability)
14. [Build & Delivery](#14-build--delivery)

---

## 1. Vision & Concept

### 1.1 The Product

**DILOS** (Automotive Performance & Experience Exchange) is a native iOS application built exclusively for car showroom sales executives. It is the single pane of glass for everything a salesperson needs during a live customer interaction — from pulling up a brochure to practicing a pitch before the floor opens, to escalating a live objection to an AI that responds with visuals, data, and the 3D model of the car itself.

The name "DILOS" is intentional. It is the top of the performance curve. Every interaction with this app should feel like driving a premium car — powerful, smooth, effortless, and unmistakably high-quality.

### 1.2 The Problem It Solves

A car showroom salesperson's day is chaotic. They:
- Struggle to find the right brochure or spec sheet when a customer asks
- Face objections they don't have the perfect data-backed answer for
- Forget key product differentiators mid-conversation
- Need to communicate with managers or head office without leaving the floor
- Have no structured way to practice pitch scenarios

DILOS eliminates every one of these friction points.

### 1.3 Core Design Mandate

> **This is not a utility app. This is a weapon.**

Every screen, every transition, every tap should make the salesperson feel more confident, more capable, more premium. The app's aesthetics should rival what they're selling. If they're selling a ₹1.5 crore car, their tool should feel like it costs that much to build.

---

## 2. Design Philosophy & System

### 2.1 Aesthetic Direction

**Refined Futurism** — the intersection of Apple's HIG precision and a automotive cockpit's purposefulness. Think: carbon fibre textures, smoked glass overlays, precision typography, and motion that feels like a throttle response — instant, weighted, never laggy.

Reference touchstones:
- **Ferrari's digital instruments** — purposeful data, premium materials
- **Apple Vision Pro UI** — spatial depth, glass morphism done right  
- **BMW iDrive 9** — dark theme, crisp typography, contextual menus
- **Apple Fitness+** — workout video-level animations, immersive headers

### 2.2 Color System

```
Background Layer 0 (deepest):  #0A0A0F   — Near-black with blue tint
Background Layer 1 (base):     #111118   — App background
Background Layer 2 (cards):    #1A1A26   — Card surfaces
Background Layer 3 (elevated): #22222E   — Modals, sheets

Accent Primary:    #C8A96E   — Champagne Gold  (the brand signature)
Accent Secondary:  #4A9EFF   — Electric Blue   (interactive states)
Accent Tertiary:   #E8E8F0   — Platinum White  (high-emphasis text)

Semantic Success:  #34C759   — iOS system green
Semantic Warning:  #FF9F0A   — iOS system amber  
Semantic Error:    #FF453A   — iOS system red
Semantic Info:     #64D2FF   — iOS system teal

Text/Primary:      #F0F0F8   — Nearly white
Text/Secondary:    #8E8EA0   — Muted lavender-grey
Text/Tertiary:     #4A4A5E   — Disabled/hint state

Gradient A:  linear(135deg, #C8A96E → #8B6914)  — Gold gradient
Gradient B:  linear(135deg, #4A9EFF → #0055CC)  — Blue gradient  
Gradient C:  linear(135deg, #1A1A26 → #0A0A0F)  — Card gradient
```

### 2.3 Typography

| Role | Font | Weight | Size | Letter Spacing |
|------|------|--------|------|----------------|
| Display / Hero | SF Pro Display | 700 Bold | 34–48pt | -0.5pt |
| Title 1 | SF Pro Display | 600 Semibold | 28pt | -0.3pt |
| Title 2 | SF Pro Display | 600 Semibold | 22pt | -0.2pt |
| Title 3 | SF Pro Text | 600 Semibold | 20pt | -0.1pt |
| Headline | SF Pro Text | 600 Semibold | 17pt | 0pt |
| Body | SF Pro Text | 400 Regular | 17pt | 0pt |
| Callout | SF Pro Text | 400 Regular | 16pt | 0pt |
| Subhead | SF Pro Text | 400 Regular | 15pt | 0pt |
| Footnote | SF Pro Text | 400 Regular | 13pt | 0pt |
| Caption | SF Pro Text | 400 Regular | 12pt | 0.2pt |
| Label / Mono | SF Mono | 500 Medium | 11pt | 0.5pt |

> All font choices are SF Pro system fonts for true native Apple fidelity. No third-party fonts.

### 2.4 Spacing & Layout

- **Base Unit**: 4pt
- **Standard Margins**: 20pt horizontal
- **Card Padding**: 20pt
- **Card Corner Radius**: 20pt (large cards), 14pt (small), 12pt (chips/badges)
- **Section Spacing**: 32pt between major sections
- **Element Spacing**: 12pt between related items, 8pt between tightly coupled items
- **Tab Bar Height**: 83pt (including safe area)
- **Navigation Bar**: 44pt standard + status bar

### 2.5 Materials & Surfaces

All surfaces use **UIBlurEffect** with the following mapping:

| Surface | Material | Custom Tint |
|---------|----------|-------------|
| Tab Bar | `.systemUltraThinMaterialDark` | 8% champagne gold tint |
| Navigation Bar | `.systemThinMaterialDark` | None |
| Cards (primary) | `.systemThickMaterialDark` + custom fill | `#1A1A26` at 85% opacity |
| Modals / Sheets | `.systemMaterialDark` | `#111118` at 90% opacity |
| Floating buttons | `.systemUltraThinMaterialDark` | 15% accent tint |
| Tooltip / Overlay | `.systemChromeMaterialDark` | None |

### 2.6 Iconography

- Use **SF Symbols 5** exclusively throughout the app
- Minimum symbol size: 22pt, weight matches surrounding text
- All interactive icons get a bounce spring animation on tap (scale 0.88 → 1.0, 0.35s spring)
- AI-related icons: Use `brain`, `sparkles`, `waveform`, `microphone.fill`
- Navigation icons: `house.fill`, `car.2.fill`, `message.fill`, `person.2.fill`, `figure.stand`

---

## 3. App Architecture & Navigation

### 3.1 Navigation Structure

```
DILOS App
│
├── [Root] Tab Bar Controller (5 tabs)
│   │
│   ├── Tab 1: Home (house.fill)
│   │   └── DashboardViewController
│   │       ├── → NotificationDetailViewController
│   │       └── → QuickStatsViewController
│   │
│   ├── Tab 2: Catalog (car.2.fill)
│   │   └── CatalogViewController (Collection View)
│   │       ├── → CarDetailViewController
│   │       │   ├── → BrochureViewerViewController (PDF/In-app)
│   │       │   └── → EmailShareSheet
│   │       └── FilterSheetViewController (bottom sheet)
│   │
│   ├── Tab 3: Studio (cube.transparent.fill)
│   │   └── StudioViewController
│   │       ├── → CarSelectorSheetViewController (bottom sheet)
│   │       └── → FeatureSpotlightOverlay (floating overlay)
│   │
│   ├── Tab 4: Comms (message.badge.filled.fill)
│   │   └── CommunicationsViewController
│   │       ├── → ThreadViewController
│   │       ├── → AnnouncementDetailViewController
│   │       └── → ComposeViewController
│   │
│   └── Tab 5: Practice (figure.mind.and.body)
│       └── PitchPracticeViewController
│           ├── → ScenarioSelectorViewController
│           ├── → LiveSessionViewController
│           └── → SessionReviewViewController
│
└── [Global Overlay] DILOS AI Button (floating, always visible)
    └── → AIAssistantSheetViewController (tall bottom sheet, ~85% screen)
        ├── → ContextualBrochureViewer (slide-in panel)
        └── → ContextualCarModelViewer (slide-in panel)
```

### 3.2 Tab Bar Design

The tab bar is custom-built (not a standard UITabBar) with the following characteristics:

- **Shape**: Floating pill with 36pt corner radius, 12pt above safe area
- **Width**: Screen width minus 32pt horizontal margin (16pt each side)
- **Material**: Ultra-thin dark blur + subtle champagne gold border at 15% opacity
- **Selection indicator**: Capsule shape with champagne gold fill at 20% opacity, icon and label tint to `Accent Primary`
- **Animation**: Spring-based tab switch with the selected tab icon doing a micro scale-up (1.0 → 1.15 → 1.0)
- **Notification badge**: Custom circular badge in `Semantic Error` red, positioned at top-right of icon

### 3.3 Navigation Transitions

| Transition | Animation |
|------------|-----------|
| Push (standard) | Standard iOS slide-from-right with parallax |
| Present Modal | Spring slide-from-bottom, backdrop blur fades in |
| Dismiss Modal | Reverse spring, drag-to-dismiss enabled |
| Tab Switch | Cross-dissolve fade + tab indicator spring |
| AI Sheet Open | Particle burst from button, sheet springs up |
| Card Tap → Detail | Hero/matched geometry transition on card image |
| 3D Studio Enter | Fade to black → 3D scene renders in |

---

## 4. Screen Specifications

### 4.1 Splash & Onboarding

#### 4.1.1 Launch Screen

- Full-screen `#0A0A0F` background
- Centred DILOS wordmark in SF Pro Display Bold 48pt, `Accent Primary` champagne gold
- Wordmark fades in (opacity 0 → 1, 0.6s ease-out) with a simultaneous upward translate (Y+20 → Y0)
- A single horizontal light streak animates across the wordmark (like a lens flare on a car badge)
- Duration: 2.2 seconds total, then cross-dissolves to login/dashboard

#### 4.1.2 Login Screen

- Full-bleed background: abstract bokeh render of showroom lights (static image, dark)
- Glassmorphic login card centred, 340pt wide
  - Company logo at top (configurable)
  - "DILOS" subheader in Caption style, letter-spaced
  - Employee ID field (SF Pro Mono, custom styled text field)
  - Biometric auth button: Touch ID / Face ID with SF Symbol `faceid` or `touchid`
  - "Sign in with Face ID" primary CTA — gold gradient button
- Login success: card scales down (1.0 → 0.92), blurs out, tab bar slides up from bottom

#### 4.1.3 First-Time Onboarding (3 screens, swipeable)

| Screen | Headline | Visual |
|--------|----------|--------|
| 1 | "Your entire showroom. In your hand." | Animated 3D car rotating slowly on dark stage |
| 2 | "Every answer, instantly." | AI chat bubble animation with sparkle particles |
| 3 | "Practice like you play." | Avatar silhouette with audio waveform |

- Page indicator: custom dot-based, gold active dot expands to pill shape
- Skip button top-right, "Get Started" gold gradient CTA bottom

---

### 4.2 Home Dashboard

**Purpose**: The daily command center. Quick orientation, key metrics, and access to everything.

#### 4.2.1 Layout Anatomy (Top → Bottom)

**Zone 1 — Greeting Header** (non-scrollable, 110pt height)
- Personalized greeting: "Good morning, Arjun." in Title 1
- Date + current shift status in Subhead, `Text/Secondary` color
- Avatar circle (38pt diameter) top-right — tapping opens profile sheet
- Subtle ambient animation: background gradient slowly shifts (breathing effect, 8s loop)

**Zone 2 — Today's Target Card** (card, full width, 140pt height)
- Gold gradient card with subtle carbon-fibre texture overlay
- Large metric: today's target number in Display size (e.g. "3 Units")
- Progress ring (custom SwiftUI) at right — shows daily/monthly progress
- "₹ Value Pipeline" secondary metric below
- Subtle shimmer animation on the gold gradient (loops every 5s)

**Zone 3 — Quick Actions Grid** (2×2 grid of capsule chips)
- "Open Catalog"  →  Tab 2
- "Start Practice"  →  Tab 5
- "View Brochures"  →  Tab 2 → Brochures filter
- "Team Comms"  →  Tab 4
- Chips: 56pt tall, blur material background, icon left + label, chevron right
- Tap animation: scale 0.95 → 1.0 with gold tint flash

**Zone 4 — Live Announcements Carousel** (horizontal scroll, 180pt card height)
- Cards sourced from Head Office (Tab 4 data)
- Card: car image header, announcement title, sender name + time
- NEW badge in red if unread
- "Swipe for more ›" hint on first launch, then disappears

**Zone 5 — My Cars (Assigned Inventory)** (horizontal scroll)
- The specific cars this salesperson has been assigned to sell today
- Compact cards: car thumbnail + name + price band + 1 key spec
- Tapping opens full detail in Catalog

**Zone 6 — Today's Leads** (list, up to 5)
- Lead card: customer name, car interest, time of appointment, status chip (New / Follow-up / Hot)
- Status color-coded chips (red = hot, blue = follow-up, grey = new)
- Swipe left: "Call" (green), "Note" (blue)
- Tapping opens a lead detail sheet

**Zone 7 — Bottom Gradient Fade** (60pt)
- Gradient from `#111118` → transparent, indicating more content below

#### 4.2.2 Floating AI Button

- Positioned: bottom-right, 20pt from edge, 20pt above tab bar
- Diameter: 56pt
- Appearance: gold gradient circle with `sparkles` SF symbol in white
- Resting animation: soft radial pulse glow (scale 1.0 → 1.08 → 1.0, 3s loop, opacity 80% → 0% on outer ring)
- Tap: Haptic feedback (`.impactOccurred(.medium)`), particle burst, AI sheet slides up
- **Always visible across all screens except when AI sheet is open or during 3D Studio immersive mode**

---

### 4.3 Product Catalog & Brochures

**Purpose**: The salesperson's digital product library. Find any car, pull up its brochure, and share it — in seconds.

#### 4.3.1 Catalog List View (default)

**Navigation Bar**:
- Large title: "Catalog" (collapses on scroll)
- Search bar: standard iOS inline search with `magnifyingglass` icon
- Filter button top-right: `line.3.horizontal.decrease.circle.fill` icon

**Filter Bar** (horizontal scroll chips below search):
- All | Sedans | SUVs | Hatchbacks | EVs | Luxury | By Price ↑↓
- Active filter chip: gold gradient fill, white text
- Inactive: blur material, `Text/Secondary` text

**Car Cards** (full-width, 240pt height):

```
┌─────────────────────────────────────────────┐  ← 20pt radius
│                                             │
│   [Car Hero Image — full bleed, 160pt]     │  ← parallax on scroll
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ COMPACT BADGE   [EV] [NEW]          │   │  ← badge chips
│  │ Honda Elevate                       │   │  ← Title 2, Platinum
│  │ Petrol · SUV · ₹12.5 – 16.8 L     │   │  ← Subhead, Secondary
│  │                                     │   │
│  │ ★ 4.6  ·  2 Brochures  ·  6 Colors │   │  ← Caption row
│  │                          [▶ View]   │   │  ← CTA chip
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

- Card tap: matched geometry hero animation → Car Detail screen
- Long press: context menu with "Open Brochure", "Share", "Add to Favourites", "View in 3D"

#### 4.3.2 Car Detail Screen

**Hero Section** (300pt, full width):
- Large car image with parallax scroll effect
- Back chevron top-left (large, 44pt tap target)
- Share button top-right (`square.and.arrow.up`)
- Bottom gradient overlay: `#0A0A0F` 0% → 100%
- Car name overlaid on gradient in Display Bold
- Subtitle: variant name, price in Title 3 gold

**Tab Selector** (custom segmented control, 3 segments):
- Overview | Brochures | Variants

**Overview Tab**:
- Key specs grid: 2×2 cards with icon + value + label
  - Engine: e.g. "1.5L Turbo"
  - Power: "160 bhp"
  - 0–100: "8.2s"
  - Boot: "458L"
- Short marketing description (3–4 lines, expandable with "Read more")
- Color selector: horizontal swatch strip with car image updating dynamically (fade transition)
- "View in 3D Studio →" large button (gold gradient, routes to Tab 3 with this car pre-selected)

**Brochures Tab**:
- Grid: 2 columns, card per brochure document
- Brochure card (160pt height):
  - PDF thumbnail (generated from first page)
  - Document name
  - File size + page count in caption
  - Three icons below: `eye.fill` (View), `envelope.fill` (Email), `square.and.arrow.down.fill` (Save)
- "Email to Customer" flow:
  - Tap `envelope.fill`: bottom sheet slides up
  - Pre-filled "To:" field (manual entry or from Leads list)
  - Subject: auto-populated "DILOS | [Car Name] Brochure"
  - Body: pre-written professional template
  - Attach brochure: auto-attached, shown as chip
  - "Send" gold CTA button
  - Success: check animation, toast notification

**Variants Tab**:
- List of all variants for the selected car
- Variant row: name left, price right, chevron to expand full spec comparison
- "Compare" button: select 2 variants → side-by-side comparison sheet

#### 4.3.3 Brochure Native Viewer

- Launched fullscreen with a bottom-safe-area navigation bar
- PDF rendered using `PDFKit` — smooth pinch-to-zoom, swipe to page
- Page thumbnails strip at bottom (horizontal scroll)
- Toolbar: `arrow.down.circle.fill` (save), `envelope.fill` (email), `square.and.arrow.up` (share), `xmark.circle.fill` (close)
- All controls in glassmorphic pill containers
- Presentation: slide-up sheet from the brochure card (matched geometry from thumbnail)

---

### 4.4 AI Objection Handler

**Purpose**: The salesperson's live intelligence lifeline. Ask anything, get an answer backed by data, visuals, and if relevant — the actual car model or brochure pulled up contextually.

#### 4.4.1 Floating AI Button Behaviour (Global)

- Present across all main tabs
- Position: bottom-right, above tab bar
- On tap: haptic + particle burst from button + sheet rises
- The button morphs: gold circle expands into a thin arc, then the sheet appears
- When sheet is open: button becomes a downward chevron `xmark` to close

#### 4.4.2 AI Assistant Sheet

**Presentation**: Full-height bottom sheet (88% of screen height), with:
- Drag handle top-center (4pt × 36pt pill)
- Swipe-down to dismiss with spring
- Background: `#111118` with top-edge blur bleed into the screen behind

**Sheet Layout** (top → bottom):

**Header Row** (64pt):
- `sparkles` icon (animated — rotating slowly, gold tint)
- "DILOS Intelligence" in Headline semibold
- History button top-right (`clock.arrow.circlepath`)

**Prompt Suggestions** (shown only when no conversation is active):

Horizontal scroll of scenario chips, categorized:

| Category | Example Prompts |
|----------|-----------------|
| **Pricing** | "Customer says our price is higher than competitors" / "Is there any scope for negotiation on the Creta?" |
| **Technical** | "What's the real-world mileage of the EV variant?" / "Compare safety features with Toyota Hyryder" |
| **Finance** | "Best EMI option for ₹15L budget customer" / "Which bank gives best rate on our cars?" |
| **Objection** | "Customer is unsure and wants to think" / "They like the car but want a bigger boot" |
| **Features** | "What makes this better than the competition?" |

Prompt chips: horizontal scroll, blur material cards with category color dot

**Conversation Area** (scrollable, fills sheet body):
- User messages: right-aligned, gold gradient bubble, white text
- AI messages: left-aligned, dark blur card with thin gold left border
- AI message anatomy:
  - Text answer (primary)
  - [If applicable] Data card: compact spec table or comparison grid embedded in message
  - [If applicable] Contextual action: "View [Car Name] Brochure" or "Open in 3D Studio" — these are action chips that open contextual panels **within** the sheet without closing it
  - [If applicable] "Why this answer" expandable section with source indicator

**Input Bar** (fixed bottom, 64pt):
- Text field: "Ask anything about the floor..."
- Microphone button left: `microphone.fill` — tap to speak (STT via iOS speech API)
- Send button right: animated arrow with gold gradient, disabled state when empty
- When recording: waveform animation replaces input field, pulsing audio bars

#### 4.4.3 Contextual Panels (within AI Sheet)

When AI response includes "View Brochure" or "Open 3D" chips:

- Panel slides in from the right within the sheet (not full screen takeover)
- Panel width: 85% of sheet width
- Sheet body blurs behind panel
- Panel has its own dismiss `xmark` button
- Brochure panel: mini PDFKit viewer (scrollable pages)
- 3D panel: lightweight SceneKit render of the car (without full Studio controls), rotatable by finger

---

### 4.5 Product Highlights & 3D Studio

**Purpose**: The showroom floor demo screen. A cinematic, immersive 3D experience that lets the salesperson (or customer) explore the car visually while key features are highlighted in an aesthetic, futuristic overlay.

#### 4.5.1 Studio Entry Animation

- From tab tap or "View in 3D Studio" deep link:
- Screen fades to pure black (0.4s)
- Brand wordmark "DILOS STUDIO" fades in center (gold, Display Bold)
- Wordmark dissolves as the 3D scene fades in
- Scene starts with a cinematic pan-in from behind the car (camera path, 1.8s)
- Total entry: ~2.5 seconds

#### 4.5.2 Car Selector

- Activated on entry if no car is pre-selected
- Bottom sheet, 50% screen height
- Grid of car model cards: thumbnail + name + "LOADED" indicator if previously cached
- Selecting a car triggers the entry animation with that car's model
- Can also switch car while in session via a carousel overlay (triggered by `arrow.2.circlepath` button)

#### 4.5.3 3D Studio Main View

**Layout**:
- Full screen, no nav bar, no tab bar (immersive)
- Status bar hidden
- Single "exit" button: top-left, glassmorphic pill with `xmark` icon

**3D Render Area** (SceneKit / RealityKit):
- Car model on a black ground plane with subtle reflections (ground plane material: mirror-like dark reflection)
- Three-point studio lighting setup simulated in SceneKit:
  - Key light: warm (5600K) from upper-left
  - Fill light: cool (4200K) from right
  - Rim light: neutral from behind (creates car silhouette glow)
- Car casts real-time shadow on the ground plane
- HDRI environment map (dark studio, optional showroom preset)

**Camera Controls**:
- One-finger drag: orbit camera around car (full 360°)
- Two-finger pinch: zoom in/out (range: 0.4× to 3×)
- Two-finger drag: pan
- Double-tap: snap to preset views (Front / Side / 3/4 / Interior / Rear)
- Camera transitions between preset views: smooth cubic bezier interpolation over 0.8s

**Feature Hotspots**:
- While in the default view, floating annotation markers appear on the car
- Marker design: small gold pulsing sphere + thin line + text label
- Markers for: Engine, Safety Tech, Sunroof, Infotainment, Seats, Wheels, Boot
- Tapping a marker: camera smoothly orbits to best view of that feature, then a feature detail card slides up from bottom

**Feature Detail Card** (slides up 45% of screen):
- Glassmorphic bottom sheet
- Feature name in Title 2
- Short description (2–3 lines)
- Key stat or USP highlighted in gold
- "Ask AI about this" chip — opens AI sheet pre-filled with the feature context
- Dismiss: swipe down or tap card background

#### 4.5.4 Studio Controls Bar

- Floating pill at bottom-center, glassmorphic, 56pt tall
- Left to right: `paintpalette.fill` (Colors) | `lightbulb.fill` (Lighting preset) | `viewfinder` (Reset view) | `arkit` (AR Mode) | `info.circle.fill` (Features toggle)

**Color Selector**:
- Tapping `paintpalette.fill`: circle swatch palette fans out above the pill (arc arrangement)
- Selecting a color: SceneKit material on car body mesh updates with a paint-reveal animation (shader transition, 0.8s)

**AR Mode**:
- Uses RealityKit ARView
- User can place the car in their physical environment (showroom floor, customer's driveway via camera)
- Scale controls appear: life-size vs. scaled
- Share AR screenshot button

#### 4.5.5 Feature Highlights Cinematic Mode

- Activated by a "Play Tour" button (triangle play icon) in the controls bar
- Automated cinematic flythrough: pre-authored camera path visits each feature hotspot
- At each stop: camera holds, feature annotation animates in, AI voice narration plays (TTS with pre-generated script per car)
- "Pause" / "Skip" controls appear top-center
- This mode is designed to be shown directly TO the customer — hand them the phone

---

### 4.6 Head Office Communications

**Purpose**: Role-appropriate communication channel for the sales team. A salesperson sees inbound from their manager, team announcements, product alerts, and escalation threads.

#### 4.6.1 Role Definition (Salesman View)

For the purposes of this spec, the app is built from the **Salesman role** perspective. The salesman can:

- **Receive** announcements from Head Office / Brand Team (read-only)
- **Send & receive** messages in their assigned team channel (Manager → Team)
- **Receive** direct messages from their immediate Sales Manager
- **Send** escalations upward (with a specific "Escalate" message type)
- **Cannot** post to all-company channels (they are viewers only)
- **Cannot** direct message peers (only manager/team lead)

#### 4.6.2 Communications Home Screen

**Layout** (3 sections):

**Section 1 — Pinned Announcements Banner**:
- Horizontal scroll of high-priority announcements from HO
- Card: bold headline + category badge (Price Update / Product Launch / Promotion / Policy)
- Unread: gold left border + `NEW` badge
- Tapping: full announcement detail sheet

**Section 2 — My Team Channel**:
- Single prominent card: "[Team Name]" channel
- Last message preview + time + unread count badge
- Tapping: opens thread view for the team channel

**Section 3 — Direct Messages**:
- List style
- Each row: avatar (initials, generated color) + name + role + last message + time
- Entries are limited to manager / team lead only
- "Escalate an issue" button at bottom of this section — specialized escalation flow

#### 4.6.3 Thread View

- Standard iOS message list (bottom-anchored, keyboard-aware)
- Messages grouped by date (date pills: "Today", "Yesterday", "March 22")
- Message bubble design:
  - Salesman's messages: right-aligned, gold gradient bubble
  - Manager/HO messages: left-aligned, dark blur bubble with sender name above in Caption
  - System messages (status updates): center-aligned, italic Caption in `Text/Secondary`
- Media support: images (tap to full screen), PDF attachments (open in viewer), voice notes (waveform playback)
- Input bar: text field + attach (`paperclip`) + camera (`camera.fill`) + send button
- Long press on message: react with emoji, copy, or "Create Action Item" (saves to Home dashboard)

#### 4.6.4 Announcement Detail

- Full-screen sheet
- Hero image (if applicable)
- Category badge + "From: Head Office" + timestamp
- Headline in Display Bold
- Body text with markdown rendering (bold, lists, links)
- Attached brochures / files (link to Catalog viewer)
- "Acknowledge" button (marks as read, sends confirmation receipt)
- Share within team: forward to team channel

#### 4.6.5 Escalation Flow

- Triggered by "Escalate an issue" button
- Guided form sheet:
  - Issue type selector: Pricing Query / Customer Request / Inventory Issue / Technical / Other
  - Urgency selector: Low / Medium / High (color coded chips)
  - Description field (multiline, required)
  - Attach evidence: photos, voice note
  - "Who should see this?": auto-populated with Manager (greyed, not editable for salesman)
  - "Submit Escalation" gold gradient button
- On submit: confirmation animation + thread created in DMs automatically

---

### 4.7 AI Avatar Pitch Practice

**Purpose**: A simulated customer interaction with an AI persona. The salesperson speaks (or types) and gets realistic customer objections, questions, and feedback — helping them rehearse without a live customer.

#### 4.7.1 Practice Home Screen

**Header**: "Pitch Practice" Title 1 + "Build your edge." subheader in gold

**Section 1 — My Performance**:
- Compact stat cards (horizontal scroll):
  - Sessions this week | Best score | Objections handled | Avg session length
- "View detailed analytics" → Performance sheet (line charts, radar chart of skills)

**Section 2 — Choose a Scenario**:

Grid of scenario cards (2 columns):

| Scenario | Avatar Name | Difficulty |
|----------|-------------|------------|
| Budget-conscious first-time buyer | "Rahul Sharma" | ⬤ Beginner |
| Tech-savvy young professional | "Priya Mehra" | ⬤⬤ Intermediate |
| Skeptical customer comparing brands | "Mr. Kapoor" | ⬤⬤⬤ Advanced |
| NRI returning home, high expectations | "Vikram Nair" | ⬤⬤⬤ Advanced |
| Fleet buyer for company | "Anita Bose" | ⬤⬤ Intermediate |
| Price negotiator (maximally difficult) | "The Negotiator" | ⬤⬤⬤⬤ Expert |

- Scenario card: illustrated avatar (stylized, not photorealistic) + name + role description + difficulty pip dots + car category they're interested in
- Selecting a scenario → car selection sheet → session begins

**Section 3 — Custom Scenario**:
- "Create Custom" card with dashed gold border
- Tapping: compose a custom scenario via AI (describe your own customer type)

#### 4.7.2 Session Configuration

- Bottom sheet, 60% screen
- Selected scenario summary at top
- "Select car to pitch": car picker (same as catalog cards, compact)
- "Mode": Full Pitch (salesperson opens) / Objection Gauntlet (AI fires objections immediately) / Q&A Drill
- "Session length": 5 min / 10 min / Open-ended
- "Difficulty override" slider if desired
- "Begin Session" gold gradient CTA

#### 4.7.3 Live Session Screen

**Layout** (full screen, immersive):

**Background**: subtle animated gradient, slow moving, dark (not distracting)

**Avatar Zone** (top 55% of screen):
- Stylized AI avatar (animated 2D illustration or 3D avatar using RealityKit or Lottie-based)
- Avatar speaks with lip-sync animation (driven by TTS output timing)
- When "thinking": avatar shows neutral expression with subtle breathing animation
- When speaking: mouth animation + text appears below in a speech bubble-style card
- Avatar expressions change based on sentiment: skeptical brow, interested lean-in, pleased nod
- Behind avatar: subtle ambient glow ring that pulses with speech

**Context Bar** (between avatar and input):
- Car being discussed: compact thumbnail + name
- Session timer
- "Hints" button: `lightbulb.fill` — tapping shows a suggested response direction (not the exact answer) in a tooltip

**Salesperson Input Zone** (bottom 35%):
- Primary mode: voice
  - Large microphone button (56pt, gold gradient circle)
  - When recording: waveform bars animate, "listening..." text
  - When processing: "DILOS thinking..." with spinner
  - When ready: AI avatar becomes active and responds
- Secondary mode: text (keyboard icon bottom-right toggles to text input field)
- "End Session" small text link bottom-center

#### 4.7.4 AI Avatar Response System

When the salesperson speaks:
1. STT transcribes response
2. AI evaluates: correctness, confidence language, feature accuracy, objection handling quality
3. AI generates avatar response (next customer line OR a follow-up objection)
4. TTS speaks avatar response with real-time lip sync
5. Session transcript logged

**In-session coaching** (subtle):
- If salesman makes a significant error: a small amber `exclamationmark.circle` appears top-right (not disruptive)
- Reviewing it at end: reveals what was flagged

#### 4.7.5 Session Review Screen

Displayed immediately after session ends.

**Score Card** (animated reveal):
- Overall score: large circular progress ring (animated fill), 0–100
- Gold/Silver/Bronze medal icon based on score bracket
- "Great session, Arjun!" or "Push harder — the Negotiator won." contextual headline

**Skills Breakdown** (radar/spider chart):
- Axes: Product Knowledge | Objection Handling | Confidence Language | Feature Accuracy | Closing Technique

**Transcript Review**:
- Full session transcript in the chat bubble format from the session
- AI-flagged moments have amber highlight and expandable coaching note
- Green highlights on excellent responses

**AI Coach Summary**:
- 3–5 bullet coaching points generated by AI
- "What you did well" section (green)
- "Areas to work on" section (amber)
- "Suggested scenario for next session" with quick-start button

**Actions**:
- "Retry this scenario" | "Share my score" | "Back to Practice"

---

## 5. Animation & Motion System

### 5.1 Core Principles

1. **Physics-based springs** for all interactive elements. Never linear easing on UI that the user triggers.
2. **Duration discipline**: 0.25s for micro-interactions, 0.35s for medium transitions, 0.6s for page transitions, 1.5–2.5s for cinematic/entry animations.
3. **Nothing starts without a purpose**: every animation communicates something (a state change, a hierarchy reveal, a loading state).
4. **The 60fps floor**: all animations must sustain 60fps on iPhone 12 and above. Test specifically.

### 5.2 Micro-Interactions

| Trigger | Animation |
|---------|-----------|
| Button tap | Scale 0.94 → 1.0 · spring(0.3, 0.6) |
| Card tap | Scale 0.97 → 1.0 · spring(0.3, 0.7) |
| Tab icon select | Scale 1.0 → 1.18 → 1.0 · spring(0.5, 0.5) + gold tint |
| Toggle switch | Spring overshoot, thumb shadow grows |
| Chip select | Background fills from tap point (radial) |
| Score reveal | Number counts up with slight overshoot |
| Badge appear | Scale from 0 with spring bounce |
| New message | Slide in from right with fade |

### 5.3 Page & Screen Transitions

| Transition | Spec |
|------------|------|
| Card → Detail | `UIViewControllerTransitioningDelegate` matched geometry. Card image expands to hero. Other content fades in staggered (50ms per element, 8 elements max). |
| Modal Sheet | Spring from bottom. Backdrop `UIBlurEffect` fades in simultaneously. Drag handle pulses once on appear. |
| Tab switch | Views cross-dissolve at 0.2s. Selected tab icon does micro spring. |
| 3D Studio Enter | Opacity fade to black (0.4s) → wordmark (0.6s) → 3D scene render (1.5s) |
| Session Start | Avatar zooms in from small central point, background gradient blooms out |
| Score Reveal | Elements appear in sequence with upward spring: score ring fills first, then stats, then text |

### 5.4 Ambient / Idle Animations

These run continuously in the background, never demanding attention:

| Element | Animation |
|---------|-----------|
| AI button glow ring | Opacity pulse: 80% → 0%, scale 1.0 → 1.4, 3s loop |
| Dashboard gradient | Slow hue shift (8s loop, 5° range) |
| Today's Target card shimmer | Highlight sweeps left-to-right every 5s, 40% opacity |
| 3D car in idle | Slow auto-rotate: 0.3 deg/sec |
| Avatar idle state | Subtle breathing (scale 1.0 → 1.008, 4s loop) |
| Onboarding car | Slow continuous 360° rotate, 12s/revolution |

### 5.5 Loading States

- **Skeleton screens**: all list views and detail screens show skeleton placeholder cards (animated gradient shimmer) while data loads
- **Content fades in**: loaded content fades in and translates up 12pt from skeleton position
- **Progress indicators**: custom circular progress, gold stroke on dark track
- **AI thinking indicator**: three dots that scale sequentially (not opacity — scale) in gold

---

## 6. Component Library

All components are custom-designed but follow HIG conventions.

### 6.1 DILOSCard

```
Properties:
  - style: .primary (gold accent) | .secondary (blur) | .minimal
  - cornerRadius: CGFloat (default: 20)
  - hasShadow: Bool (default: true)
  - isInteractive: Bool (enables tap scale animation)
  - badge: DILOSBadge? (optional overlay badge)

Shadow spec (hasShadow=true):
  - Color: #000000 at 40% opacity
  - Blur: 24pt
  - Y offset: 8pt
```

### 6.2 DILOSButton

```
Styles:
  - .primaryGold: gold gradient fill, white label, full-width by default
  - .secondaryOutline: transparent fill, gold border 1pt, gold label
  - .ghost: no background, secondary label color
  - .destructive: red gradient, white label
  - .floating: circular, for FABs

Sizes:
  - .large: 56pt height, 17pt font
  - .medium: 44pt height, 15pt font
  - .small: 32pt height, 13pt font
  - .pill: hugs content width, 32pt height
```

### 6.3 DILOSTextField

```
- Dark blur background
- Gold underline (1pt) that animates to full border on focus
- Label floats up on focus/fill
- Error state: red border + error message below
- Custom clear button icon
```

### 6.4 DILOSBadge

```
Types:
  - .count(Int): red circle with number
  - .label(String): pill with text (e.g. "NEW", "HOT", "EV")
  - .dot: 8pt colored dot
  
Colors: .error | .warning | .success | .info | .gold
```

### 6.5 DILOSAvatar

```
- Initials-based (letter generated from name)
- Color: deterministic from name hash (6 preset gradients)
- Sizes: 28pt | 38pt | 52pt | 72pt
- Optional presence indicator (online dot, 8pt, bottom-right)
```

### 6.6 DILOSProgressRing

```
- Track color: Text/Tertiary
- Progress stroke: Gold gradient
- Center: value label (customizable)
- Animation: stroke draws in on appear (spring, 0.8s)
- Sizes: .small(44) | .medium(72) | .large(120)
```

### 6.7 DILOSToast

```
- Appears from top-center, slides down and fades out after 3s
- Types: .success (green icon) | .error (red icon) | .info (blue icon) | .neutral
- Glassmorphic pill, 16pt corner radius
- Haptic: .notificationOccurred(.success/.error/.warning)
- Can be dismissed by swipe-up
```

---

## 7. Data Models & API Contracts

### 7.1 Core Models

```swift
// MARK: — Car Model
struct Car: Codable, Identifiable {
    let id: UUID
    let make: String               // e.g. "Honda"
    let model: String              // e.g. "Elevate"
    let variantName: String        // e.g. "ZX Turbo CVT"
    let category: CarCategory      // .sedan | .suv | .hatchback | .ev | .luxury
    let priceRange: PriceRange     // min/max ex-showroom
    let specs: CarSpecs
    let colors: [CarColor]
    let brochures: [Brochure]
    let model3DURL: URL?           // USDZ file for SceneKit/RealityKit
    let heroImageURL: URL
    let galleryImageURLs: [URL]
    let isAssignedToMe: Bool
    let rating: Double
}

struct CarSpecs: Codable {
    let engine: String
    let powerBhp: Int
    let torqueNm: Int
    let transmissions: [String]
    let fuelTypes: [FuelType]      // .petrol | .diesel | .electric | .hybrid | .cng
    let bootLiters: Int
    let seatingCapacity: Int
    let safetyRating: Int?         // NCAP stars
    let mileage: MileageSpec       // city/highway/claimed
    let keyFeatures: [Feature]
}

struct Feature: Codable, Identifiable {
    let id: UUID
    let name: String
    let description: String
    let iconSystemName: String     // SF Symbol name
    let position3D: SIMD3<Float>?  // optional: hotspot position in 3D model
    let mediaURL: URL?             // optional image/video
}

// MARK: — Brochure
struct Brochure: Codable, Identifiable {
    let id: UUID
    let carId: UUID
    let title: String
    let fileURL: URL               // remote PDF URL or local cache
    let thumbnailURL: URL
    let pageCount: Int
    let fileSizeMB: Double
    let language: String           // "en" | "hi" | "mr" etc.
    let lastUpdated: Date
}

// MARK: — Lead
struct Lead: Codable, Identifiable {
    let id: UUID
    let customerName: String
    let phone: String
    let email: String?
    let interestedCarId: UUID?
    let appointmentTime: Date?
    let status: LeadStatus         // .new | .warm | .hot | .followUp | .converted | .lost
    let notes: [LeadNote]
    let assignedToId: UUID         // salesperson ID
}

// MARK: — Communication
struct Message: Codable, Identifiable {
    let id: UUID
    let threadId: UUID
    let senderId: UUID
    let senderName: String
    let senderRole: UserRole
    let content: MessageContent
    let timestamp: Date
    let isRead: Bool
    let attachments: [Attachment]
}

enum MessageContent: Codable {
    case text(String)
    case announcement(AnnouncementPayload)
    case escalation(EscalationPayload)
    case systemEvent(String)
}

// MARK: — Practice Session
struct PracticeSession: Codable, Identifiable {
    let id: UUID
    let scenarioId: UUID
    let carId: UUID
    let startTime: Date
    let endTime: Date?
    let transcript: [SessionTurn]
    let scoreCard: ScoreCard?
}

struct ScoreCard: Codable {
    let overallScore: Int           // 0–100
    let breakdown: ScoreBreakdown
    let coachingNotes: [CoachingNote]
    let highlightedMoments: [SessionMoment]
}

struct ScoreBreakdown: Codable {
    let productKnowledge: Int
    let objectionHandling: Int
    let confidenceLanguage: Int
    let featureAccuracy: Int
    let closingTechnique: Int
}

// MARK: — User
struct SalesUser: Codable, Identifiable {
    let id: UUID
    let name: String
    let employeeCode: String
    let role: UserRole             // .salesman | .teamLead | .manager | .headOffice
    let showroomId: UUID
    let assignedCarIds: [UUID]
    let targetUnitsMonthly: Int
    let unitsClosedMonthly: Int
    let avatarURL: URL?
}

enum UserRole: String, Codable {
    case salesman, teamLead, manager, regionalManager, headOffice
}
```

### 7.2 API Endpoints (REST/JSON)

```
Base URL: https://api.DILOS-auto.in/v1

Authentication:
  POST   /auth/login              { employeeCode, password }
  POST   /auth/biometric          { deviceId, biometricToken }
  POST   /auth/refresh            { refreshToken }

Cars & Catalog:
  GET    /cars                    ?category=&search=&page=&limit=
  GET    /cars/{id}              
  GET    /cars/{id}/brochures    
  GET    /cars/{id}/model3d      → returns signed URL for USDZ download
  GET    /cars/assigned           → my assigned cars

Brochures:
  GET    /brochures/{id}/download → signed PDF URL
  POST   /brochures/{id}/email    { recipientEmail, message? }

Leads:
  GET    /leads/mine             
  POST   /leads/{id}/note        { content }
  PATCH  /leads/{id}/status      { status }

Communications:
  GET    /threads                 → list of threads I'm in
  GET    /threads/{id}/messages  ?before=&limit=
  POST   /threads/{id}/messages  { content, attachments? }
  GET    /announcements           ?unreadOnly=
  PATCH  /announcements/{id}/ack 
  POST   /escalations            { type, urgency, description, attachments? }

Practice:
  GET    /scenarios              
  POST   /sessions               { scenarioId, carId, mode, targetDuration }
  POST   /sessions/{id}/turns    { audio: base64 | text }  → returns AI response
  POST   /sessions/{id}/end     
  GET    /sessions/{id}/review   → returns ScoreCard
  GET    /sessions/history        → my past sessions

AI (Objection Handler):
  POST   /ai/query               { question, context?: { carId?, screenContext? } }
                                  → returns { answer, sources, contextualActions[], dataCards[] }
  GET    /ai/prompts             → curated prompt suggestions

Notifications:
  GET    /notifications           ?unreadOnly=&limit=
  PATCH  /notifications/read-all 
  POST   /notifications/register-device  { apnsToken, deviceId }
```

### 7.3 WebSocket Events (Real-time)

```
Connection: wss://ws.DILOS-auto.in/v1?token={accessToken}

Incoming events:
  message.new          → { threadId, message: Message }
  announcement.new     → { announcement: Announcement }
  notification.new     → { notification: Notification }
  session.aiResponse   → { sessionId, turn: SessionTurn }  (streaming AI in session)

Outgoing:
  message.read         → { threadId, messageId }
  presence.update      → { status: "active" | "busy" | "away" }
```

---

## 8. Technical Architecture

### 8.1 Platform & Minimum Requirements

| Item | Spec |
|------|------|
| Platform | iOS only |
| Minimum iOS | iOS 17.0 |
| Devices | iPhone 12 and above (no iPad version in v1) |
| Orientation | Portrait only |
| Architecture | MVVM + Coordinator pattern |
| UI Framework | SwiftUI (primary) with UIKit interop where needed |
| 3D Rendering | RealityKit (primary) with SceneKit fallback |
| PDF Viewing | PDFKit (native) |
| Networking | URLSession + Async/Await |
| State Management | Combine + @Observable (Swift 5.9+) |
| Local Database | SwiftData (persistent models) |
| Caching | NSCache (in-memory) + FileManager (disk, PDF/USDZ) |
| Push Notifications | APNs via backend |
| Speech | AVFoundation (recording) + SFSpeechRecognizer (STT) |
| TTS | AVSpeechSynthesizer (native) |
| AR | ARKit + RealityKit |
| Biometrics | LocalAuthentication framework |
| Keychain | Security framework |
| Analytics | Custom events to backend (no third-party SDK) |

### 8.2 Project Structure

```
DILOS.xcodeproj
│
├── App/
│   ├── DILOSApp.swift
│   ├── AppCoordinator.swift
│   └── AppEnvironment.swift
│
├── Core/
│   ├── Network/
│   │   ├── APIClient.swift
│   │   ├── WebSocketManager.swift
│   │   ├── Endpoints.swift
│   │   └── Interceptors/
│   ├── Storage/
│   │   ├── SwiftDataStack.swift
│   │   ├── CacheManager.swift
│   │   └── KeychainManager.swift
│   ├── Auth/
│   │   ├── AuthManager.swift
│   │   └── BiometricManager.swift
│   └── Extensions/
│
├── Features/
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── DashboardViewModel.swift
│   │   └── Components/
│   ├── Catalog/
│   ├── Studio3D/
│   ├── Communications/
│   ├── PitchPractice/
│   └── AIAssistant/
│
├── DesignSystem/
│   ├── Colors.swift
│   ├── Typography.swift
│   ├── Spacing.swift
│   ├── Components/
│   │   ├── DILOSCard.swift
│   │   ├── DILOSButton.swift
│   │   ├── DILOSTextField.swift
│   │   ├── DILOSBadge.swift
│   │   ├── DILOSProgressRing.swift
│   │   ├── DILOSToast.swift
│   │   └── DILOSTabBar.swift
│   └── Animations/
│       ├── SpringPresets.swift
│       ├── TransitionLibrary.swift
│       └── AmbientAnimations.swift
│
├── Resources/
│   ├── Assets.xcassets
│   ├── Localizable.strings
│   └── 3DModels/            ← bundled low-res fallback USDZs
│
└── Tests/
    ├── UnitTests/
    └── UITests/
```

### 8.3 Dependency Management (Swift Package Manager only)

No third-party UI libraries. Only:

| Package | Purpose |
|---------|---------|
| None — pure native | All UI is custom |
| Lottie (Airbnb) | Avatar animations in Pitch Practice only |
| SwiftOTP | For optional 2FA in login |

### 8.4 Security

- All API calls over HTTPS with certificate pinning
- Auth tokens stored in Keychain (not UserDefaults)
- PDFs cached to a protected directory (`FileProtectionType.complete`)
- Biometric re-authentication required after 15 minutes of background
- No sensitive data in logs in production builds
- AI query content is not stored on device (only session metadata)

---

## 9. AI & Intelligence Layer

### 9.1 AI Objection Handler — Model & Prompting

**Model**: GPT-4o or Claude 3.5 Sonnet (configurable via backend config flag)

**System Prompt Architecture**:

```
You are DILOS, an AI sales intelligence assistant for a car showroom salesperson in India.
Your role is to help sales executives in real-time during customer interactions.

Context injected per request:
- Showroom name and location
- Salesperson name and experience level
- Current car being discussed (if applicable)
- Screen context (which feature/screen triggered the query)
- Inventory and pricing data (retrieved from RAG)

Response format requirements:
1. Answer: concise, confident, data-backed (3–5 sentences max)
2. dataCards: array of structured data (specs, comparisons, prices) for display
3. contextualActions: ["viewBrochure:{carId}", "openStudio:{carId}", "compareWith:{carId}"]
4. confidence: high | medium | low
5. sources: ["Product spec sheet", "FADA pricing data", etc.]

Tone: Confident, knowledgeable. Never say "I don't know" — say "Let me show you what I have on that."
Language: English, but natural Indian English. Indian price formatting (Lakhs/Crores).
```

### 9.2 Pitch Practice AI — Model & Persona System

**Model**: Same LLM with a different system prompt per scenario.

Each scenario has:
- **Persona definition**: name, age, profession, budget, decision-making style, pain points
- **Knowledge state**: what they know about cars, what they've seen/researched
- **Emotional state**: skeptical / excited / worried / rushed / analytical
- **Primary objection** (the one they'll always eventually raise)
- **Secondary objections** (2–3 to deploy mid-conversation)
- **Win condition**: what would actually convince this persona

**Difficulty mapping**:
- Beginner: accepts most answers, one objection, patient
- Intermediate: 2–3 objections, some price pushback
- Advanced: 4+ objections, competitor comparison, budget squeeze
- Expert: everything above + emotional roleplaying (reluctant spouse at home, deadline pressure)

### 9.3 Contextual AI — Data Retrieval (RAG)

The AI is augmented with a RAG pipeline connected to:
- Full car spec database (all makes and models in inventory)
- Brochure text extraction (indexed and searchable)
- Current on-road pricing by city/state
- Competitor comparison database (Honda vs Toyota vs Hyundai etc.)
- Finance calculator (EMI computation with current bank rates)
- Live promotions and offers (from Head Office feed)
- FADA / regulatory data (safety ratings, emission norms)

### 9.4 Session Evaluation (Pitch Practice)

A separate evaluation prompt runs after each session turn:

```
Evaluate this salesperson response:
[response text]

Against the following criteria:
1. Product Knowledge (0–20): Did they cite correct specifications?
2. Objection Handling (0–20): Did they address the concern directly with evidence?
3. Confidence Language (0–20): Did they use assertive, positive framing?
4. Feature Accuracy (0–20): Did they accurately represent features without overselling?
5. Closing Technique (0–20): Did they move toward a next step or decision?

Return JSON: { scores: {...}, flags: [{moment, issue, suggestion}] }
```

---

## 10. 3D Model System

### 10.1 File Format

- **Primary**: USDZ (Universal Scene Description Zipped) — native to Apple ecosystem
- **Fallback**: REALITY file (compiled RealityKit)
- Models sourced from: manufacturer press kits, or 3D modelling vendors
- LOD strategy: 3 levels (Low 50K poly for AR, Medium 200K for Studio, High 500K for Feature Highlights)

### 10.2 Asset Pipeline

```
Raw 3D Model (OBJ/FBX from manufacturer)
    ↓
[Python script] Optimize mesh, reduce poly count, set pivot
    ↓
[Blender] UV unwrap, material assignment, color variants as USD material variants
    ↓
[Reality Composer Pro] Add SceneKit/RealityKit annotations, feature hotspot anchors
    ↓
USDZ export → Upload to CDN
    ↓
Backend registers URL in car.model3DURL
    ↓
App downloads on first Studio entry, caches to disk
```

### 10.3 Material System (Car Paint)

Each car color variant is a USD Material Variant:
- Base color (albedo)
- Metallic value (0.0 = matte, 1.0 = full metallic)
- Roughness (0.05–0.25 for car paint)
- Clear coat layer (separate material layer, roughness ~0.02)
- Normal map (for panel lines, body creases)

Color switching in-app triggers a USD material variant switch on the car's body mesh node — instant, no re-loading.

### 10.4 Feature Hotspot System

Hotspots are Entity objects parented to the 3D car scene:
- Position: attached to specific mesh points (e.g., sunroof center, headlight assembly)
- Follow the mesh in any camera position
- Rendered as custom SCNNode with pulsing gold sphere + line
- Tap detection via hitTest on the SceneKit scene

---

## 11. Permissions & Access Control

### 11.1 iOS Permissions Required

| Permission | Usage | When Requested |
|------------|-------|----------------|
| Camera | AR mode in 3D Studio, document scanning | First AR use |
| Microphone | Voice input in AI assistant and Pitch Practice | First voice query |
| Speech Recognition | STT for voice input | With microphone |
| Face ID / Touch ID | Biometric login | On login screen |
| Notifications | Push notifications from Head Office | After login |
| Photo Library | Saving screenshots from AR mode | On AR screenshot |
| Local Network | (not required in v1) | — |

### 11.2 Role-Based Feature Access

| Feature | Salesman | Team Lead | Manager | Head Office |
|---------|----------|-----------|---------|-------------|
| View catalog | ✓ | ✓ | ✓ | ✓ |
| Share brochures | ✓ | ✓ | ✓ | ✓ |
| View 3D Studio | ✓ | ✓ | ✓ | ✓ |
| AI Objection Handler | ✓ | ✓ | ✓ | ✓ |
| Pitch Practice | ✓ | ✓ | ✓ | — |
| View my leads | ✓ | ✓ (team) | ✓ (all) | — |
| Post announcements | — | — | ✓ | ✓ |
| DM salesperson | — | ✓ (their team) | ✓ (all) | ✓ |
| View team analytics | — | ✓ (their team) | ✓ (all) | ✓ |
| Manage inventory | — | — | ✓ | ✓ |

---

## 12. Notifications System

### 12.1 Notification Types

| Type | Priority | Banner | Badge | Sound |
|------|----------|--------|-------|-------|
| New announcement from HO | High | ✓ | ✓ | Custom chime |
| Direct message received | High | ✓ | ✓ | Default |
| Price/offer update | High | ✓ | ✓ | Custom chime |
| Lead appointment reminder | Critical | ✓ | ✓ | Urgent sound |
| New lead assigned | Medium | ✓ | ✓ | Default |
| Practice session reminder | Low | ✓ | — | — |
| Brochure updated | Low | ✓ | — | — |

### 12.2 Notification Center (In-App)

- Bell icon in dashboard top-right
- Badge count overlay on bell icon
- Notification list: grouped by date, categorized by type
- Swipe left: mark as read / dismiss
- Tap: deep links directly to the relevant screen/content

### 12.3 Rich Notification Support

- Lead appointment reminders: inline action buttons: "Call Customer" | "Mark Arrived" | "Reschedule"
- New announcement: "View Announcement" action button
- New message: "Reply" quick reply in notification (without opening app)

---

## 13. Offline Capability

### 13.1 What Works Offline

| Feature | Offline Capability |
|---------|-------------------|
| Catalog browsing | ✓ Full (cached cars and images) |
| Brochure viewing | ✓ Full (if previously downloaded) |
| 3D Studio | ✓ Full (if model cached) |
| Dashboard (static) | ✓ Last-cached data with staleness indicator |
| Pitch Practice | ✓ If AI responses are cached scenario-by-scenario |
| AI Objection Handler | ✗ Requires network |
| Communications | ✗ Requires network (read-only from cache) |
| Lead notes | ✓ Write locally, sync on reconnect |

### 13.2 Sync Strategy

- Background refresh every 30 minutes when app is in background
- On foreground: immediate check for announcements + message count
- SwiftData handles offline writes with sync queue
- Conflict resolution: server wins for catalog/pricing, last-write-wins for notes

---

## 14. Build & Delivery

### 14.1 Versioning

```
Version format: MAJOR.MINOR.PATCH (e.g. 1.0.0)
Build number: auto-incremented by CI
```

### 14.2 Environments

| Environment | API | Purpose |
|-------------|-----|---------|
| Development | dev.api.DILOS-auto.in | Daily development |
| Staging | staging.api.DILOS-auto.in | QA and UAT |
| Production | api.DILOS-auto.in | Live |

Switching via Xcode scheme + build config.

### 14.3 CI/CD

- **CI**: GitHub Actions or Xcode Cloud
- **On PR**: Run unit tests, SwiftLint, snapshot tests
- **On merge to main**: Build staging IPA, upload to TestFlight
- **Release**: Manual trigger, builds production IPA, submits to App Store

### 14.4 App Store Metadata

- **App Name**: DILOS — Auto Sales Platform
- **Category**: Business
- **Age Rating**: 4+
- **Privacy**: Location not collected. No data sold. AI queries processed server-side.
- **In-App Purchases**: None (B2B enterprise license)
- **Distribution**: Internal distribution via Apple Business Manager (preferred), or limited App Store release

### 14.5 v1 Scope vs. Future Versions

| Feature | v1 | v2 | v3 |
|---------|----|----|-----|
| All 5 main screens | ✓ | | |
| Floating AI Button | ✓ | | |
| 3D Studio (non-AR) | ✓ | | |
| AR Mode | | ✓ | |
| Cinematic Feature Tour | | ✓ | |
| iPad version | | ✓ | |
| Apple Watch complication | | | ✓ |
| CarPlay integration (showroom screens) | | | ✓ |
| Multi-language (Hindi, Marathi, Tamil) | | ✓ | |
| Customer-facing mode (kiosk) | | | ✓ |
| CRM integration (Salesforce / Zoho) | | ✓ | |
| Finance calculator module | | ✓ | |
| Video brochures | | ✓ | |

---

## Appendix A — Screen Flow Diagram

```
[Launch]
    │
    ▼
[Login / Biometric]
    │
    ▼
[Dashboard] ─────────────────────────────────────────────────────────┐
    │                                                                  │
    ├──[Floating AI Button]──► [AI Sheet] ──► [Contextual Brochure] │
    │                                   └──► [Contextual 3D View]    │
    │                                                                  │
[Tab Bar]──────────────────────────────────────────────────────────   │
    │                                                                  │
    ├── [Catalog] ──► [Car Detail] ──► [Brochure Viewer]             │
    │                             └──► [Email Share Sheet]            │
    │                             └──► [Variant Comparison]           │
    │                                                                  │
    ├── [3D Studio] ──► [Car Selector] ──► [Studio View]            │
    │                                 ──► [Feature Hotspot Detail]    │
    │                                 ──► [AR Mode]                   │
    │                                                                  │
    ├── [Communications] ──► [Thread View]                            │
    │                    ──► [Announcement Detail]                     │
    │                    ──► [Escalation Form]                        │
    │                                                                  │
    └── [Pitch Practice] ──► [Scenario Selector]                     │
                         ──► [Session Config]                         │
                         ──► [Live Session]                           │
                         └──► [Session Review] ──► [Retry / Home] ──┘
```

---

## Appendix B — Design Checklist (Pre-Dev)

- [ ] Design system tokens defined in Figma (colors, type, spacing, effects)
- [ ] All screens wireframed at 390pt canvas (iPhone 15 Pro)
- [ ] All screens in high-fidelity mockup (dark theme)
- [ ] All animations prototyped (Figma prototype or Principle)
- [ ] Custom tab bar component approved
- [ ] 3D car model pipeline tested with at least 2 sample models
- [ ] AI prompt templates reviewed and signed off
- [ ] API contracts agreed between iOS and backend teams
- [ ] Accessibility audit: Dynamic Type support, VoiceOver labels
- [ ] Haptic map documented and approved
- [ ] Push notification payloads agreed with backend
- [ ] App Store screenshots prepared (6.5", 5.5" sizes)

---

*DILOS App Specification — Confidential · v1.0 · Prepared for Development Handoff*
*All dimensions in points (pt). All durations in seconds (s).*
