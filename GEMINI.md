# Nivo POS (`nivopos.in`) — Permanent AI Project Rulebook & Architecture Standards

> **MANDATORY INSTRUCTION FOR ALL AI AGENTS & DEVELOPERS:**  
> This document defines the permanent, non-negotiable architectural standards, design system tokens, security rules, and tech stack constraints for **Nivo POS** (`nivopos.in`). Every future feature, module, page, and component MUST automatically adhere to these rules without exception.

---

## 1. Design System & Theme Tokens (Option 3 — Light Business SaaS)

Nivo POS is built with a modern, high-trust, crisp **Light Business SaaS** visual identity tailored for Indian retail enterprises, Kiranas, supermarkets, and distributors.

### 🎨 Color Palette & Centralized Tokens
All components must use these centralized colors configured in `tailwind.config.js`:

| Token Name | Hex Code | Tailwind Utility Class | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **`nivo.bg`** | `#F4F6F9` | `bg-nivo-bg` | Main application canvas background |
| **`nivo.card`** | `#FFFFFF` | `bg-nivo-card`, `bg-white` | Cards, modals, tables, surfaces, dropdowns |
| **`nivo.border`** | `#E2E8F0` | `border-nivo-border` | Standard card borders, table row dividers, inputs |
| **`nivo.borderSubtle`** | `#CBD5E1` | `border-nivo-borderSubtle` | Emphasized dividers, hover states |
| **`nivo.ink`** | `#0F172A` | `text-nivo-ink` | Primary headings, table text, invoice amounts |
| **`nivo.inkLight`** | `#1E293B` | `text-nivo-inkLight` | Body copy, labels, primary navigation links |
| **`nivo.muted`** | `#64748B` | `text-nivo-muted` | Secondary descriptions, timestamps, metadata |
| **`nivo.indigo`** | `#4338CA` | `bg-nivo-indigo`, `text-nivo-indigo` | Primary brand accent, primary CTA buttons |
| **`nivo.indigoHover`** | `#3730A3` | `hover:bg-nivo-indigoHover` | Hover state for primary buttons |
| **`nivo.teal`** | `#0D9488` | `bg-nivo-teal`, `text-nivo-teal` | UPI payments, GST badges, active status indicators |
| **`nivo.tealHover`** | `#0F766E` | `hover:bg-nivo-tealHover` | Hover state for teal actions |
| **`nivo.amber`** | `#D97706` | `bg-nivo-amber`, `text-nivo-amber` | Low stock warnings, unpaid Udhar status |
| **`nivo.rose`** | `#E11D48` | `bg-nivo-rose`, `text-nivo-rose` | Destructive actions, delete, error notices |

### 🚫 Strict Color Prohibitions & Mandatory Pre-Flight Verification
- **NEVER** use dark black backgrounds (`#000000`, `#0a0a0a`, `bg-slate-950`, `bg-[#070A11]`, `bg-[#0B1120]`) anywhere in the Nivo POS application or dashboard.
- **NEVER** use neon green (`#00FF00`, `#00F5A0`, `emerald-`, `green-`, `lime-`) or electric gaming-style glow aesthetics.
- Maintain high contrast, crisp typography (Inter / Segoe UI), clean borders (`#E2E8F0`), and professional business SaaS aesthetics.
- **MANDATORY PRE-FLIGHT VERIFICATION RULE:** Before finishing any task, grep `src/` to verify zero dark card backgrounds (`bg-slate-900`, `bg-slate-950`, `bg-black`, `bg-[#0`) and zero `emerald-`/`green-` classes exist anywhere. Every component MUST strictly use `#F4F6F9`, `#FFFFFF`, `#0F172A`, `#4338CA`, and `#0D9488`.

---

## 2. Multi-Tenant Data Isolation (Zero Data Leaks)

Nivo POS is a multi-tenant retail operating system. Every store's data must remain strictly isolated.

1. **Mandatory Store ID Filtering:**
   - Every Supabase query on `products`, `invoices`, `invoice_items`, `customers`, and future store-level tables **MUST explicitly filter by `store_id = session.user.id`** (or `auth.uid()`).
   - Every `INSERT` query must explicitly attach `store_id: session.user.id`.
   - Never query or update store tables without scoping to `store_id`.

2. **Row Level Security (RLS):**
   - Ensure all Supabase tables have RLS enabled with policies verifying `auth.uid() = store_id` or `auth.uid() = id`.

---

## 3. Zero Dummy UI & Zero Dead Buttons

1. **No Fake Data:**
   - Never hardcode dummy products (no fake Atta/Oil/Butter mocks in active user dashboards).
   - If a store has 0 products or 0 invoices, render clean, informative empty states with direct actions (e.g. "+ Add Your First Product").

2. **No Dead Buttons or "Coming Soon" Placeholders:**
   - Every single button, tab, link, and input rendered in the user interface **MUST perform a real, working database or browser action** (e.g., real Supabase CRUD, real `window.print()` receipt printing, real `https://wa.me/...` invoice dispatch, real QR generation).
   - Do not render non-functional buttons or fake placeholder tabs.

3. **Strictly Hidden HQ Admin (`/hq-admin`):**
   - `/hq-admin` is strictly restricted to verified founders in `public.hq_admins` (`user_id = auth.uid()` and `is_active = true`).
   - **NEVER place any links to `/hq-admin`** on public pages (`LandingPage.tsx`, navbar, footer, or auth modals).

---

## 4. Zero UI Freeze & High-Speed Counter Performance

Counter retail checkouts happen in seconds during Indian rush hours:
- Use clean, predictable React state and standard Tailwind CSS transitions.
- **Avoid** heavy Framer Motion layout loops, recursive `useEffect` chains, or blocking synchronous calculations.
- Tab switching and button clicks must respond instantaneously (0ms perceived latency).

---

## 5. Permitted Tech Stack & Package Rules

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS + Lucide Icons + `qrcode.react`.
- **Database & Auth:** Supabase (`@supabase/supabase-js`).
- **Cloud Storage:** Cloudflare R2 (for media and document uploads).
- **Fast AI Inference:** Groq API (`GROQ_API_KEY`).
- **PROHIBITED:** Never install or reference Google Gemini packages or APIs in this workspace (`@google/generative-ai`, `gemini-api`, etc.).
- **PROTECTED FILES:** Never edit, touch, overwrite, or delete `.env` or `.gitignore`.
