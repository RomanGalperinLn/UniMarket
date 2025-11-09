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

## 🌟 Why UniMarket Stands Out

### 🎓 1. Built for Real Student Communities  
UniMarket isn’t just another marketplace — it’s built around campus life.  
Every feature, from verification to delivery, is designed to make student trading safe, simple, and trustworthy.

---

### 🤖 2. AI-Powered Fair Pricing  
Using Gemini AI, UniMarket compares item prices across online marketplaces to suggest fair, transparent values.  
It helps buyers avoid overpaying and rewards sellers for fair listings.

---

### 🔐 3. Verified Trust System  
Users verify their identity through email or student domain, and both buyers and sellers confirm exchanges using a unique **handoff code** — no scams, no uncertainty, just trust.

---

### ⚙️ 4. Auctions Made Simple  
Students can host live auctions for textbooks, electronics, or dorm goods with real-time bidding, animated price graphs, and transparent commission logic.

---

### 💸 5. Commission That Gives Back  
A small platform commission (e.g., 10%) feeds into a **loyalty pool** — returning cashback and perks to active users who help grow the UniMarket community.

---

### 🎨 6. Clean, Modern Design  
UniMarket blends calm academic colors with intuitive layouts — designed to feel as familiar as a campus noticeboard, yet as fluid as a fintech dashboard.

---

### 💬 7. For Students, By Students  
Every line of UniMarket’s design reflects how real students buy and sell: fast, honest, and flexible.  
It’s not about corporate resale — it’s about **community-driven commerce.**

---

> 🪙 **UniMarket turns student trade into a trusted network — where AI ensures fairness, and every deal builds community.**
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
