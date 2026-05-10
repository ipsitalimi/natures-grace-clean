# Nature's Grace - Design Guidelines

## Brand Identity
A calm wellness platform that feels like entering a quiet room. The experience should be grounded, premium, and gentle — never trendy, flashy, or urgent.

**Core Principle**: Everything optional, nothing demanding.

## Navigation Architecture
**Root Navigation**: Bottom Tab Navigation (fixed, always visible)
- Home (active on launch)
- Wellness
- Explore
- Mood
- Profile

**No drawer, no modals on home screen, no scrolling.**

## Home Screen Specification

**Purpose**: Immediate post-login landing. User orients, selects next action, sees upcoming session and inspiration.

**Critical Constraints**:
- ❌ NO SCROLLING — entire screen fits in one fixed mobile viewport
- ❌ No background images, landscapes, or mountains
- ❌ No cards beyond what's specified
- ❌ No extra sections below the fold
- ❌ No animations
- If content overflows → shrink spacing, not layout

**Layout Structure (Top → Bottom)**:

1. **Top Bar**
   - Left: Nature's Grace logo (leaf icon + text)
   - Right: notification bell icon
   - No heavy header bar, keep airy
   - Safe area: top inset

2. **Greeting Section**
   - Centered text: "Welcome back, [User Name]"
   - Subtext: "How are you feeling today?"
   - Serif or soft humanist font for headings
   - Calm spacing, not oversized

3. **Primary Actions (3 Buttons – ONE ROW)**
   - Three equal-width rounded cards side-by-side:
     - Start a Session
     - Reflect & Journal
     - Explore Wellness
   - Each card: simple icon + text label + soft background
   - No loud CTA colors, subtle entry points

4. **Affirmation Line**
   - Centered text: "Take a deep breath. You are here now."
   - Small decorative divider beneath (very subtle line or wave)

5. **Info Cards (2 Cards – SIDE BY SIDE)**
   - **Left card**: "Your Next Session"
     - Session name
     - Time
     - Small "View Details →" text
   - **Right card**: "Daily Inspiration"
     - Short quote
     - Soft muted button: "Open Wellness"
   - Cards must be equal height and fit without scrolling

6. **Bottom Tab Navigation**
   - Fixed position, always visible
   - Safe area: bottom inset + tab bar height
   - Active tab highlighted subtly (icon + label)
   - Icons simple, rounded, not sharp
   - No transparency or blur

## Color Palette
- **Background**: Soft off-white / warm beige (#F7F5F2) — slight paper texture feel, but flat color
- **Primary**: Muted sage green (#A8B5A0)
- **Accent**: Darker olive green (#6B7C61)
- **Text**: Soft charcoal (#3A3A3A) — not pure black
- **Card Background**: Slightly warmer white (#FDFCFA)

## Typography
- **Headings**: Serif or soft humanist font (e.g., Crimson Text, Lora)
- **Body**: Clean sans-serif (e.g., Nunito Sans, Inter)
- **Hierarchy**: Calm, not oversized. Generous line height.

## Visual Design
- Rounded corners everywhere (cards, buttons)
- Generous whitespace, but fits in one screen
- Minimal shadows (very soft, low elevation)
  - shadowOffset: {width: 0, height: 1}
  - shadowOpacity: 0.05
  - shadowRadius: 2
- Use Feather icons for UI elements
- No emojis

## UX Rules
- No urgency language
- No "Buy", "Limited", or sales copy
- No social feed elements
- No notifications popping
- Everything should feel optional and gentle

## Assets to Generate

**Required**:
1. **icon.png** - App icon: Minimalist leaf in sage green circle (WHERE USED: Device home screen)
2. **splash-icon.png** - Launch screen: Same leaf icon (WHERE USED: App startup)
3. **logo-horizontal.png** - Nature's Grace logo with leaf icon and text (WHERE USED: Home screen top bar)
4. **leaf-divider.png** - Subtle wave or line divider (WHERE USED: Below affirmation text on Home)

**Recommended**:
5. **icon-session.png** - Simple meditation cushion icon (WHERE USED: "Start a Session" card)
6. **icon-journal.png** - Pen/notebook icon (WHERE USED: "Reflect & Journal" card)
7. **icon-wellness.png** - Gentle heart/plant icon (WHERE USED: "Explore Wellness" card)

**Style**: Minimal line art, muted sage green, matching the app's quiet aesthetic. No busy details.