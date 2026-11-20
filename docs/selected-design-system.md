# Selected Design System: Padmaraga Lotus & Antique Brass

> **Sattvic Sanctum Edition**  
> Tailored for SMARAN (स्मरण) — Devotional Sadhana & Japa Chanting Sanctuary.

---

## 1. Aesthetic Direction & Philosophy
- **Design Philosophy:** World-class software craft inspired by **Apple, Linear, and Notion**, infused with authentic Vedic temple aesthetics.
- **Atmosphere:** Warm, serene, grounding, and heart-centering.
- **Exclusions:** Strictly avoids cold/clinical electric blues and artificial green tints. Never looks templated or AI-generated.

---

## 2. Core Color Palette Tokens

| Role | Color Name | Hex Code | Visual & Devotional Purpose | WCAG Contrast |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Accent** | Royal Lotus Crimson | `#7A2638` | Primary CTAs, active states, Japa Mala focus | **9.7 : 1** (AAA) |
| **Hover / Pressed** | Velvet Wine | `#641C2C` | Button hover and active press depths | High |
| **Active Highlights** | Vibrant Lotus | `#9E364C` | Milestone indicators, progress bars, active borders | High |
| **Text Ink (on Tint)** | Deep Lotus Ink | `#4F1220` | High-contrast copy on petal washes | **13.5 : 1** (AAA) |
| **Surface Wash** | Lotus Petal Wash | `#FDF1F3` | Soft badge backgrounds, selected card fills | Serene & clean |
| **Temple Metallic** | Antique Temple Brass | `#C29438` | Sacred icons, Sumaru head bead, kalasha accents | Warm metallic |
| **Base Canvas** | Sandalwood Ivory | `#FAF7F2` | Main page background (soft on eyes) | 0% glare |
| **Elevated Surface** | Warm Paper | `#FFFFFF` | Cards, modals, dialogs, dropdowns | Pure contrast |
| **Subtle Fill** | Chandan Linen | `#F4EFE6` | Segmented controls, slider tracks, table headers | Warm tactile |
| **Hairline Borders** | Chandan Sandalwood | `#E7DFD3` | 1px clean crisp division hairlines | Neutral clean |
| **Primary Body Ink** | Deep Charcoal | `#1F1D1A` | Main scripture text, headings, counters | **14.2 : 1** (AAA) |
| **Secondary Ink** | Soft Umber | `#665F55` | Timestamps, secondary notes, meta labels | **4.9 : 1** (AA) |
| **Night Canvas** | Temple Night | `#1A1315` | Dark mode surface (warm slate, non-blue) | Deep dark |

---

## 3. Component Design Patterns

### Digital Japa Mala Wheel
- **Chanted Beads:** Multi-stop faceted Padmaraga ruby gemstone gradient (`#C44D62` → `#8A253A` → `#4A101D`) with subtle specular highlights.
- **Unchanted Beads:** Carved warm sandalwood ivory beads (`#FFFCF5` → `#EFE5D2` → `#CBBCA2`).
- **Meru / Crown Bead:** Antique Gold Kalasha cap with silk tassel connecting at 12 o'clock.
- **Cadence Strip:** Unified 4-segment milestone pill (`27`, `54`, `81`, `108`) with active Lotus highlights.

### Sliders (Pace Guidance & Tanpura Audio)
- **Tracks:** Pill-shaped Chandan linen (`#E7DFD3`) with dynamic linear-gradient progress fill in Royal Lotus Crimson (`#7A2638`).
- **Thumbs:** White-rimmed Padmaraga Lotus circle with active micro-scale (`active:scale-110`).
- **Zero Browser Blue:** Fully custom cross-browser WebKit and Firefox implementation.

### Cards & Modals
- **Surfaces:** Pure Warm Paper (`#FFFFFF`) with 1px Chandan Sandalwood border (`#E7DFD3`).
- **Elevation:** Multi-layered neutral ambient shadows (`shadow-sacred-sm`, `shadow-sacred-lg`), completely avoiding muddy drop shadows.
- **Buttons:** Tactile `rounded-xl` primary buttons (`#7A2638`) with soft spring scaling (`active:scale-[0.96]`) and luminous hover aura (`rgba(122, 38, 56, 0.42)`).

---

## 4. Typography
- **Headings & Sacred Text:** Cormorant Garamond / Noto Serif (`font-serif`, `font-display`).
- **Interface & Metrics:** Noto Sans / Inter with tabular numerals for counts (`font-sans`, `tabular-nums`).
- **Devanagari / Mantras:** Tiro Devanagari Sanskrit with comfortable leading (`leading-relaxed`).
