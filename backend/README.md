# Squid Meme Backend

> Bringing utility to meme coins through gamification on MemeCore

A Web3-powered meme token gaming platform that enhances the MemeCore ecosystem by adding interactive game mechanics, social features, and reward systems to meme coins.

## Overview

Squid Meme transforms idle meme tokens into engaging gaming experiences. Built on the Formicarium testnet (MemeCore's Ethereum-compatible network), this platform allows users to:

- **Create & Join Games**: Launch meme token games with customizable prize pools
- **Compete for Prizes**: The last commenter before the timer ends wins the pot
- **Fund Prize Pools**: Support games by adding to the prize pool
- **Earn Through Engagement**: Complete quests and maintain streaks for rewards
- **Build Reputation**: Climb the leaderboards through activity and wins

### Why Squid Meme?

Meme coins often lack utility beyond speculation. Squid Meme bridges this gap by:

| Problem | Solution |
|---------|----------|
| Meme coins sit idle in wallets | Use them in interactive games |
| No community engagement tools | Comment-based competition system |
| Limited token utility | Quest rewards, rankings, and prizes |
| Fragmented MemeCore experience | Seamless integration with MemeCore tokens |

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | NestJS v11 |
| Language | TypeScript |
| Database | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| Blockchain | ethers.js v6 |
| Storage | Supabase Storage |
| API Docs | Swagger/OpenAPI |
| Deployment | Railway |

## Features

### Game System
- Create games with any MemeCore token
- Configurable game duration and entry costs
- Automatic prize distribution via smart contracts
- Real-time game state tracking

### Social Layer
- On-chain comments linked to games
- Like system for community engagement
- User profiles with MemeX integration

### Quest & Rewards
- Daily check-in streaks (5-day, 20-day milestones)
- Comment activity goals (20, 50 comments)
- Claimable rewards for completed quests

### Rankings
- Prize leaderboard (total winnings)
- Activity leaderboard (most comments)
- Game leaderboard (by prize pool size)

### Funding Mechanism
- Anyone can add to a game's prize pool
- Track all funders and contributions
- Incentivizes larger prize pools

## Project Structure

```
backend/src/
├── domains/                    # Feature modules
│   ├── comment/               # Comments & likes
│   ├── funders/               # Prize pool funding
│   ├── game/                  # Game lifecycle
│   ├── quests/                # Quest system
│   ├── token/                 # Token metadata
│   ├── transaction/           # DB transactions
│   ├── upload/                # Image uploads
│   ├── users/                 # User profiles & rankings
│   └── winners/               # Prize claims
│
├── common/                    # Shared utilities
│   ├── db/                    # Drizzle ORM & schemas
│   ├── decorators/            # Custom decorators
│   ├── providers/             # Ethereum provider
│   ├── interceptors/          # Response interceptors
│   ├── supabase/              # Storage client
│   └── types/                 # Shared types
│
├── app.module.ts              # Root module
└── main.ts                    # Application entry
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (or Supabase account)

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Create `.env.local` with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Blockchain (Formicarium Testnet)
ETHEREUM_RPC_URL="https://rpc.formicarium.memecore.net"

# Smart Contract
COMMENT_GAME_V3_ADDRESS="0x..."

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Server (Optional)
PORT=3000
```

### Database Setup

```bash
# Generate migrations
npm run db:generate

# Apply schema (development)
npm run db:push

# Run migrations (production)
npm run db:migrate
```

### Running the Server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

### API Documentation

Swagger UI available after starting the server:
- http://localhost:3000/api-docs

## API Reference

### Games `/v1/games`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create a new game |
| GET | `/live` | List active games |
| GET | `/active/:gameId` | Get game details |
| POST | `/:gameId/claim` | Claim prize |

### Users `/v1/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/join` | Connect wallet / Sign up |
| GET | `/me` | Get current user |
| GET | `/profile` | Get profile page data |
| GET | `/prize-ranking` | Prize leaderboard |
| GET | `/most-comments` | Activity leaderboard |

### Comments `/v1/comments`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create comment (tx-based) |
| GET | `/game/:gameId` | Get game comments |
| POST | `/:id/like` | Toggle like |

### Quests `/v1/quests`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List my quests |
| POST | `/claim/:questId` | Claim quest reward |

### Funders `/v1/funders`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Record funding (tx-based) |
| GET | `/by-game/:gameId` | Get game funders |

### Upload `/v1/upload`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/image` | Upload image (max 5MB) |

## Authentication

Header-based wallet authentication:

```
x-wallet-address: 0x1234...
```

All authenticated endpoints require this header.

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles, wallet addresses, token balances, check-in history |
| `games` | Game state, prize pool, timer, last commenter |
| `comments` | Comment content, author, like count |
| `comment_likes` | Like relationships |
| `tokens` | Token metadata (symbol, image, MemeX info) |
| `winners` | Prize claim records |
| `funders` | Funding contributions |
| `user_quests` | Quest progress and completion |

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

## Deployment

Deployed automatically via Railway:

1. Push to `main` branch
2. Railway builds and deploys
3. Environment variables configured in Railway dashboard

## Blockchain Integration

### Network: Formicarium Testnet (MemeCore)

| Property | Value |
|----------|-------|
| Chain ID | 43521 |
| RPC URL | https://rpc.formicarium.memecore.net |
| Type | Ethereum-compatible |

### Smart Contract Events

| Event | Description |
|-------|-------------|
| `GameCreated` | New game initialized |
| `CommentAdded` | Comment posted to game |
| `PrizeClaimed` | Winner claimed prize |
| `PrizePoolFunded` | Prize pool increased |

## MemeCore Compatibility

Squid Meme is designed to work seamlessly with the MemeCore ecosystem:

- **Token Support**: Any MemeCore token can be used for games
- **MemeX Integration**: User profiles link to MemeX identities
- **Shared Infrastructure**: Built on Formicarium testnet
- **Cross-Platform**: Enhances MemeCore tokens with gaming utility

---

**Squid Meme** - *Making meme coins fun again*
