# UniMarket — Smart Campus Marketplace & Auction Platform

> **Buy smart. Sell fairly. Earn trust.**  
> A full-stack, AI-powered marketplace where students and local buyers can sell, buy, and auction items securely with transparent pricing, verified exchanges, and loyalty-based rewards.

---

## Overview

**UniMarket** is a student-first commerce ecosystem designed for fairness, transparency, and simplicity.  
Students often struggle to resell or buy used items safely — UniMarket solves that by merging **AI-driven pricing**, **secure payment flows**, and **verified handoff confirmation codes**.

This project combines the speed of modern front-end frameworks, the reliability of Stripe payments, and the intelligence of Google’s Gemini AI to bring a seamless trading experience to campuses and beyond.

---

## Core Philosophy

- **Transparency:** Every trade displays a clear, AI-audited price comparison.  
- **Trust:** All users verify their email and optionally their student domain.  
- **Safety:** Dual verification at delivery — no scams, no ghost trades.  
- **Community:** Earn loyalty cashback and grow a visible trust score.  
- **Scalability:** Built modularly to expand beyond universities.  

---

## Live Demo

> [🌍 Visit UniMarket (Demo URL)](https://unimarketyeah.base44.app)  
> *(Hosted via Base44 — SPA fallback enabled)*

> ⚠️ If the demo doesn’t load, the app may be under development. You can clone locally (see below).  

---

## ✨ Key Features

| Category | Description |
|-----------|-------------|
| **AI Price Scanner** | Uses Gemini API to compare product pricing across sources and recommend a fair market value. |
| **Stripe Demo Payments** | Secure, test-mode checkout flow for buyers with virtual cards linked to profiles. |
| **Marketplace Listings** | Dynamic grid with filters, search, and seller verification badges. |
| **Live Auctions** | Real-time bidding, countdown timers, and animated bid progression charts. |
| **Handoff Verification** | Dual confirmation via 6-digit code or QR — buyer confirms receipt → seller gets paid. |
| **Loyalty Rewards** | Frequent traders earn cashback and trust points based on commission refunds. |
| **Admin Insight Lab** | Visual analytics for total revenue, disputes, user stats, and trends. |
| **Theming System** | Light/Dark toggle, smooth transitions, and an elegant color palette. |
| **Notifications & Trust System** | Real-time UI toasts, activity alerts, and profile trust progress bar. |

---

## Why UniMarket Stands Out

### 1. Emotion Before Interface  
Unlike standard wellness platforms that start with rigid forms and menus, **UniMarket begins with empathy**.  
Every screen, from the breathing orb to the conversational AI echo, listens before it instructs — allowing users to feel understood before they are guided.

---

### 2. AI That Reflects, Not Dictates  
Our Gemini-powered “Echo AI” doesn’t prescribe or score behavior.  
It mirrors tone, rhythm, and emotional context — turning analytics into reflection.  
UniMarket transforms raw input into dialogue, making emotion tracking feel conversational rather than clinical.

---

### 3. Design as Therapy  
The visual language of Rest Quest is not decorative — it’s therapeutic.  
Mesh gradients, orbiting layers, and glassmorphic surfaces synchronize with breathing cues.  
Motion is calibrated to calm the mind and reduce cognitive load, inviting *scrolls that soothe*.

---

### 4. Rituals Over Routines  
Instead of one-size-fits-all sessions, users curate a **Ritual Stack** — personalized emotional experiences that evolve over time.  
Each ritual becomes a living playlist that adapts to your pace, energy, and seasonal mood.

---

### 5. Cinematic Yet Lightweight  
Built entirely with **vanilla web technology**, **no heavy 3D engines**, and optimized animations.  
Despite its cinematic depth, the SPA runs smoothly even on mid-tier devices — delivering luxury calm at minimal computational cost.

---



## Architecture

```plaintext
┌───────────────────────────────┐
│          Frontend             │
│   React + Vite + Tailwind     │
│   → Pages: Home, Market, etc. │
│   → Contexts: Auth, Auctions  │
└──────────────┬────────────────┘
               │
     REST API / Next API routes
               │
┌──────────────┴────────────────┐
│          Backend              │
│  Node.js (Express/Next)       │
│  Prisma ORM → PostgreSQL DB   │
│  Stripe SDK (test mode)       │
│  Gemini AI Integration (stub) │
└──────────────┬────────────────┘
               │
┌──────────────┴────────────────┐
│          Database              │
│   Tables: Users, Listings,     │
│   Auctions, Bids, Transactions │
└────────────────────────────────┘


## Future Enhancements

- **Live Sentiment Fusion** — Combine Gemini and ElevenLabs to adapt visuals and breathing pace to real-time emotion.  
- **Adaptive Soundscapes** — Sync ambient layers with mood and breathing telemetry for deeper immersion.  
- **Persistent Profiles** — Save rituals, journals, and preferences to the cloud for seamless multi-device continuity.  
- **Concierge Analytics** — Introduce dashboards for hosts to view anonymized emotional trends and triggers.  
- **Mobile Companion App** — Wrap the SPA in Capacitor/Expo for on-site kiosks and mobile reflection.  
- **AR Emotional Mirror** — Visualize real-time emotion as color and motion overlays for gentle self-awareness.
