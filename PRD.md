# TermSheet — Product Requirements Document

## 1. Product Overview

**Product Name:** TermSheet
**Tagline:** "Where Founders Meet Capital, Live"
**Version:** MVP v1.0

### Vision
TermSheet is a live deal-making platform where crypto-native investors stake real capital into public "Term Sheet Mockups," and founders pitch directly to unlock that capital — like Shark Tank, but on-chain, transparent, and instant.

### Problem
- Founders waste months cold-emailing investors with no signal of intent
- Investors get flooded with low-quality deal flow
- No mechanism to verify investor seriousness (skin in the game)
- Traditional fundraising is opaque and slow

### Solution
A marketplace where investors publicly commit capital (staked on-chain), founders browse and apply to pitch, and successful deals execute instantly via smart contracts.

---

## 2. Target Users

### Investor (Shark)
- Angel investors, micro-VCs, crypto funds
- Want deal flow + credibility signal
- Willing to stake $500–$50,000 per term sheet

### Founder (Pitcher)
- Early-stage Web3/AI startup founders
- Need pre-seed to seed funding ($1K–$50K)
- Want fast, transparent fundraising

### Spectator
- Community members who watch pitches
- May provide social signal (upvotes, comments)

---

## 3. Core Features (MVP)

### 3.1 Investor Term Sheet Creation
- **Connect wallet** (MetaMask, Phantom, Coinbase Wallet)
- **Create Term Sheet Mockup:**
  - Investment amount (staked in escrow)
  - Target sector (DeFi, AI, Infra, Gaming, etc.)
  - Stage preference (Pre-seed, Seed)
  - Valuation range
  - Equity/Token terms (SAFE, Token Warrant, etc.)
  - Bio & investment thesis
- **On-chain verification:** Staked amount visible and verifiable
- **Manage Term Sheets:** Edit, pause, withdraw (with cooldown)

### 3.2 Founder Pitch Application
- **Browse Sharks:** Filter by amount, sector, stage, chain
- **View Shark Profile:** Bio, terms, staked amount, deal history
- **Apply to Pitch:**
  - Upload pitch deck (PDF/slides)
  - One-line elevator pitch
  - Project links (website, GitHub, Twitter)
  - Team info
- **Track Applications:** Pending, Accepted, Rejected, Completed

### 3.3 Pitch Session (Live)
- **Async Pitch (MVP):**
  - Founder submits deck + written pitch
  - Investor reviews within 48h
  - Decision: Accept (fund) / Reject / Request call
- **Live Pitch (v1.1):**
  - Video call within platform
  - Screen sharing for deck presentation
  - Timer (10 min pitch + 5 min Q&A)
  - Live audience (spectator mode)

### 3.4 Deal Execution
- **Accept:** Smart contract releases escrow → Founder wallet
- **Reject:** Funds return to Investor (minus gas)
- **Terms recorded on-chain** (hash of agreement)
- **Both parties sign** (wallet signature)

### 3.5 Dashboard
- **Investor Dashboard:**
  - Active Term Sheets
  - Pending Pitch Applications
  - Deal History & Portfolio
  - Total capital deployed
- **Founder Dashboard:**
  - My Pitches (status tracking)
  - Active Deals
  - Funds received

### 3.6 Social & Discovery
- **Shark Leaderboard:** Most deals, highest staked, best rating
- **Live Feed:** Real-time deal activity (X funded Y for $Z)
- **Trending Sharks:** Featured on homepage

---

## 4. Technical Requirements

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS + shadcn/ui
- **Animations:** Framer Motion
- **Wallet:** RainbowKit + wagmi (EVM) / Wallet Adapter (Solana)
- **State:** Zustand
- **Real-time:** Socket.io client

### Backend
- **Runtime:** Node.js + Express or tRPC
- **Database:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **File Storage:** Supabase Storage (pitch decks)
- **WebSocket:** Socket.io (live pitch, feed)
- **Auth:** Wallet-based (SIWE) + optional email via Supabase

### Smart Contracts
- **Chain:** Base (EVM) — low gas, Coinbase ecosystem
- **Language:** Solidity
- **Contracts:**
  - `Escrow.sol` — Hold/release/refund investor stakes
  - `TermSheet.sol` — Store term parameters, link to escrow
  - `Deal.sol` — Record completed deals on-chain
- **Tools:** Hardhat, OpenZeppelin, Foundry

### Infrastructure
- **Hosting:** Vercel (frontend) + Railway/Fly.io (backend)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry + Posthog analytics

---

## 5. User Flows

### Flow A: Investor Creates Term Sheet
1. Connect wallet
2. Click "Create Term Sheet"
3. Fill in terms (amount, sector, stage, valuation, etc.)
4. Approve token transfer to escrow contract
5. Term Sheet goes live on marketplace
6. Receive pitch applications from founders

### Flow B: Founder Pitches
1. Connect wallet (or sign up with email)
2. Browse Sharks by filter
3. Click on Shark → View term details
4. Click "Request to Pitch"
5. Upload deck + fill pitch form
6. Wait for investor review
7. If accepted → receive funds + sign terms
8. If rejected → notification + try other sharks

### Flow C: Deal Execution
1. Investor reviews pitch
2. Clicks "Accept Deal"
3. Smart contract executes:
   - Funds transfer from escrow to founder
   - Terms hash stored on-chain
4. Both parties receive confirmation
5. Deal appears in public feed

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page Load | < 2s (LCP) |
| Wallet Connect | < 3s |
| Transaction Confirmation | < 15s (Base L2) |
| Uptime | 99.5% |
| Concurrent Pitch Sessions | 50+ |
| Mobile Responsive | Yes (view only for MVP) |

---

## 7. Success Metrics (MVP)

| Metric | Target (Month 1) |
|--------|-------------------|
| Registered Investors | 50 |
| Active Term Sheets | 20 |
| Pitch Applications | 100 |
| Completed Deals | 5 |
| Total Capital Staked | $50,000 |
| DAU | 200 |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Smart contract vulnerability | Fund loss | Audit + bug bounty + amount caps |
| Low investor supply | No marketplace | Seed with 10 KOL investors |
| Regulatory concerns | Legal action | Start with Token Warrants (not equity), crypto-native users |
| Spam pitches | Bad UX for investors | Stake small fee to pitch ($5) |
| Low pitch quality | Investors leave | Curation + community ratings |

---

## 9. Future Roadmap (Post-MVP)

- **v1.1:** Live video pitch sessions with audience
- **v1.2:** Syndicate deals (multiple investors per term sheet)
- **v1.3:** Secondary market (trade Term Sheet positions)
- **v2.0:** Multi-chain support (Solana, Arbitrum)
- **v2.1:** AI pitch scoring & matching
- **v2.2:** Mobile app (React Native)
- **v3.0:** DAO governance for platform decisions
