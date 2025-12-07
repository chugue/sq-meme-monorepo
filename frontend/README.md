# Squid Meme Frontend

> Chrome Extension that brings meme coin gaming to MemeX profiles

A Web3-powered Chrome Extension that integrates comment-based gaming directly into the [MemeX](https://app.memex.xyz) platform, giving meme coins real utility through interactive competitions.

## Overview

Squid Meme injects a gaming layer onto MemeX profile pages, enabling users to:

- **Create Comment Games**: Launch games on any MemeX token profile
- **Compete for Prizes**: The last commenter before the timer ends wins the pot
- **Fund Prize Pools**: Contribute to games and boost prize amounts
- **Track Performance**: View leaderboards, stats, and game history
- **Complete Quests**: Earn rewards through daily activities

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    MemeX Profile Page                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Squid Meme Injected UI                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │ Prize Pool  │  │   Timer     │  │  Comments    │  │  │
│  │  │   500 CC    │  │   02:45     │  │   12 total   │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  Comment Section                                │ │  │
│  │  │  > User1: "Let's go!"           [♥ 5]          │ │  │
│  │  │  > User2: "To the moon!"        [♥ 3]          │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Extension Framework | WXT (Vite-based) |
| UI Library | React 19 |
| Language | TypeScript |
| State Management | Jotai |
| Server State | TanStack Query |
| Web3 | Wagmi + Viem |
| Styling | Tailwind CSS |
| Animation | Framer Motion |

## Features

### Content Script (Injected UI)

| Feature | Description |
|---------|-------------|
| Game Creation | Multi-step modal for launching games |
| Comment Section | Real-time comments with like system |
| Prize Display | Animated prize pool and timer |
| Wallet Connection | MetaMask integration |
| Winner Claim | Prize claiming interface |

### Side Panel Dashboard

| Feature | Description |
|---------|-------------|
| Live Games | Browse all active games |
| Leaderboard | Rankings by wins and activity |
| My Assets | Portfolio of held tokens |
| Quests | Daily missions with rewards |
| Profile | Stats and game history |

## Project Structure

```
frontend/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts           # Service worker
│   │   ├── content.ts              # Content script entry
│   │   └── sidepanel/              # Side panel entry
│   │
│   ├── contents/                   # Injected UI
│   │   ├── atoms/                  # Jotai state atoms
│   │   ├── components/             # React components
│   │   │   ├── CommentApp.tsx      # Main wrapper
│   │   │   ├── ProfilePage.tsx     # Profile page UI
│   │   │   ├── comment-section/    # Comment components
│   │   │   ├── game-setup-modal/   # Game creation flow
│   │   │   └── sub-components/     # Utility components
│   │   ├── hooks/                  # Custom hooks
│   │   ├── config/                 # Wagmi config
│   │   └── lib/
│   │       └── contract/           # Smart contract ABIs
│   │
│   ├── sidepanel/                  # Side panel UI
│   │   ├── App.tsx                 # Main app
│   │   ├── Dashboard.tsx           # Dashboard page
│   │   ├── LiveGamesPage.tsx       # Active games
│   │   ├── LeaderboardPage.tsx     # Rankings
│   │   ├── MyAssetsPage.tsx        # User assets
│   │   ├── QuestPage.tsx           # Quests
│   │   ├── atoms/                  # Side panel state
│   │   ├── components/             # Side panel components
│   │   └── hooks/                  # Side panel hooks
│   │
│   ├── background/                 # Background script logic
│   └── shared/                     # Shared utilities
│
├── public/
│   ├── icon/                       # Extension icons
│   └── font/                       # Custom fonts
│
├── wxt.config.ts                   # WXT configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- Chrome browser

### Installation

```bash
cd frontend
yarn install
# or
npm install
```

### Environment Setup

Create `.env.local` in the frontend directory:

```bash
# API Server
VITE_API_URL=http://localhost:3000

# Smart Contracts
VITE_COMMENT_GAME_V3_ADDRESS=0x...
VITE_MOCK_ERC20_ADDRESS=0x...

# Optional: Test Tokens
VITE_MOCK_TOKEN_1=0x...
VITE_MOCK_TOKEN_2=0x...
```

### Development

```bash
# Start extension dev server
yarn dev

# Start with Firefox
yarn dev:firefox

# Type check
yarn compile
```

### Load Extension in Chrome

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `.output/chrome-mv3` folder

### Testing

1. Go to [MemeX](https://app.memex.xyz)
2. Navigate to any profile page
3. Squid Meme UI should appear below the profile
4. Open side panel via extension icon

## Build

```bash
# Production build (Chrome)
yarn build

# Production build (Firefox)
yarn build:firefox

# Create distributable ZIP
yarn zip
```

Output: `.output/chrome-mv3/` or `.output/firefox-mv2/`

## Architecture

### Three-Layer Communication

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Injected       │     │  Content        │     │  Background     │
│  Script         │────▶│  Script         │────▶│  Script         │
│  (Page Context) │     │  (Extension)    │     │  (Service       │
│                 │◀────│                 │◀────│   Worker)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   window.ethereum         React UI              Side Panel
   Profile Data            Jotai State           Storage
```

- **Injected Script**: Accesses `window.ethereum` (MetaMask) and page data
- **Content Script**: Renders React UI, manages state
- **Background Script**: Routes messages, manages storage and side panel

### State Management

**Jotai Atoms (Content UI)**
- `activeGameInfoAtom` - Current game state
- `commentsAtom` - Comment list
- `isGameEndedAtom` - Game completion status

**Jotai Atoms (Side Panel)**
- `currentPageAtom` - Navigation state
- `sessionAtoms` - User session

**React Query**
- Server data caching
- Auto-refetching
- Optimistic updates

## Web3 Integration

### Network: MemeCore (Formicarium Testnet)

| Property | Value |
|----------|-------|
| Chain ID | 43521 |
| RPC URL | https://rpc.formicarium.memecore.net |
| Explorer | https://formicarium.memecorescan.io |

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| CommentGameV2 | Game logic, comments, prizes |
| GameFactory | Game creation |
| ERC20 | Token interactions |

### Wallet Flow

1. User clicks "Connect Wallet"
2. Injected script requests MetaMask access
3. Address synced via message passing
4. Transactions signed through MetaMask

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useWallet` | Wallet connection state |
| `useComments` | Fetch and cache comments |
| `useTokenContract` | Detect active games |
| `useCreateGame` | Game creation workflow |
| `useGameFactory` | Query game factory |
| `useMemexLogin` | MemeX authentication |

## Permissions

```json
{
  "permissions": ["activeTab", "scripting", "storage", "sidePanel"],
  "host_permissions": ["https://app.memex.xyz/*"]
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server |
| `yarn build` | Production build |
| `yarn zip` | Create extension ZIP |
| `yarn compile` | TypeScript check |

## MemeCore Compatibility

- **Token Detection**: Automatically detects MemeCore tokens on profiles
- **MemeX Integration**: Links to MemeX user identities
- **Seamless UX**: Non-intrusive UI injection
- **Cross-Platform**: Works on any MemeX profile page

---

**Squid Meme** - *Making meme coins fun again*
