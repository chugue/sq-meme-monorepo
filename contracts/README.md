# Squid Meme Contracts

> Smart contracts powering the meme coin gaming platform on MemeCore

Solidity smart contracts implementing a comment-based gaming system where users compete to be the last commenter before the timer ends, winning the prize pool.

## Overview

The Squid Meme game mechanics are simple yet engaging:

1. **Create Game**: A user creates a game with a meme token, setting duration and initial funding
2. **Comment to Compete**: Each comment costs tokens and resets the timer
3. **Win the Prize**: When the timer expires, the last commenter wins the entire prize pool

```
┌─────────────────────────────────────────────────────────────┐
│                      Game Flow                               │
│                                                             │
│   Create Game     Add Comment      Timer Ends               │
│   ┌─────────┐    ┌─────────┐      ┌─────────┐              │
│   │ Fund    │───▶│ Pay     │─────▶│ Winner  │              │
│   │ Pool    │    │ Cost    │      │ Claims  │              │
│   │ 1000 CC │    │ +0.1 CC │      │ Pool    │              │
│   └─────────┘    └─────────┘      └─────────┘              │
│        │              │                │                    │
│        ▼              ▼                ▼                    │
│   Cost = 0.01%   Timer Reset     Prize Transfer            │
│   of funding     + Fee Split     to lastCommentor          │
└─────────────────────────────────────────────────────────────┘
```

## Contract Architecture

### Contract Versions

| Version | Contract | Architecture | Status |
|---------|----------|--------------|--------|
| V1 | `CommentGame` + `GameFactory` | Factory pattern (separate contract per game) | Legacy |
| V2 | `CommentGameV2` | Consolidated (all games in one contract) | Production |
| V3 | `CommentGameV3` | Refined V2 (minor fixes) | Current |

### Contract Files

```
contracts/
├── CommentGame.sol      # V1: Individual game contract
├── CommentGameV2.sol    # V2: Consolidated multi-game contract
├── CommentGameV3.sol    # V3: Current production version
├── GameFactory.sol      # V1: Factory for deploying CommentGame
└── MockERC20.sol        # Test token for development
```

## CommentGameV3 (Current)

The main contract managing all games within a single deployment.

### Key Features

- **Multi-Game Management**: Single contract handles unlimited concurrent games
- **Funding Mechanism**: Separate prize pool funding from comment costs
- **Dynamic Cost**: Comment cost = `totalFunding / 10000` (0.01%)
- **Fee Distribution**: 2% platform fee, 98% distributed to funders
- **One Active Game per Token**: Prevents conflicting games

### Data Structures

```solidity
struct GameData {
    uint256 id;
    address initiator;
    address gameToken;
    uint256 cost;           // Auto-calculated: totalFunding / 10000
    uint256 gameTime;       // Timer duration in seconds
    string tokenSymbol;
    uint256 endTime;        // Auto-extends on each comment
    address lastCommentor;  // Current winner
    uint256 prizePool;
    bool isClaimed;
    uint256 totalFunding;
    address[] funders;
    mapping(address => uint256) fundings;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `createGame(token, time, initialFunding)` | Create new game, returns gameId |
| `fundPrizePool(gameId, amount)` | Add funding to prize pool |
| `addComment(gameId, message)` | Post comment, pay cost, reset timer |
| `claimPrize(gameId)` | Winner claims prize after game ends |
| `getGameInfo(gameId)` | Get complete game state |
| `getAllGames()` | List all games |
| `getActiveGameId(token)` | Get active game for token |
| `getFunders(gameId)` | List all funders |

### Events

```solidity
event GameCreated(gameId, initiator, gameToken, cost, gameTime, tokenSymbol, endTime, lastCommentor, totalFunding);
event CommentAdded(gameId, commentId, commentor, cost, message, timestamp, newEndTime, prizePool);
event PrizePoolFunded(gameId, funder, amount, totalFunding, newCost);
event CommentFeeDistributed(gameId, funder, amount);
event PrizeClaimed(gameId, winner, amount, timestamp);
```

### Fee Distribution

When a user comments:

```
Comment Cost (e.g., 100 tokens)
    │
    ├── 2% → Platform Fee (2 tokens)
    │
    └── 98% → Distributed to Funders (98 tokens)
              proportional to their contribution
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | Solidity 0.8.28 |
| Framework | Hardhat 3 |
| Testing | Node.js native test runner |
| Client | Viem |
| Libraries | OpenZeppelin Contracts |

## Project Structure

```
contracts/
├── contracts/              # Solidity contracts
├── scripts/               # Deployment & utility scripts
│   ├── deploy.ts          # Deploy CommentGameV2
│   ├── deployV3.ts        # Deploy CommentGameV3
│   ├── deployMockERC20.ts # Deploy test token
│   ├── createGame.ts      # Create game on-chain
│   ├── simulate_flow.ts   # Full game simulation
│   └── ...                # Other utilities
├── test/                  # Test files
│   ├── CommentGame.test.ts
│   ├── CommentGameV2.test.ts
│   ├── CommentGameV2.edge.test.ts
│   ├── CommentGameV3.test.ts
│   └── CommentGameV3.edge.test.ts
├── hardhat.config.ts      # Hardhat configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd contracts
npm install
```

### Environment Setup

Create `.env` file:

```bash
DEPLOYER_PRIVATE_KEY=0x...
```

### Compile

```bash
npm run compile
```

### Test

```bash
# Run all tests
npm test

# Run specific tests
npm run test:v2          # CommentGameV2 tests
npm run test:v2:edge     # V2 edge cases
npm run test:original    # CommentGame V1 tests
```

### Deploy

```bash
# Deploy CommentGameV3 to Formicarium
npm run deploy

# Deploy MockERC20 test token
npm run deploy:mock
```

## Network Configuration

### Formicarium Testnet (MemeCore)

| Property | Value |
|----------|-------|
| Chain ID | 43521 |
| RPC URL | https://rpc.formicarium.memecore.net |
| Explorer | https://formicarium.memecorescan.io |
| EVM Version | Paris |

### Supported Networks

| Network | Type | Description |
|---------|------|-------------|
| `hardhatMainnet` | Local | Simulated L1 |
| `hardhatOp` | Local | Simulated OP Stack |
| `formicarium` | Testnet | MemeCore L1 Testnet |

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile contracts |
| `npm test` | Run all tests |
| `npm run deploy` | Deploy to Formicarium |
| `npm run deploy:mock` | Deploy MockERC20 |
| `npm run game:create` | Create new game |
| `npm run game:simulate` | Run game simulation |
| `npm run token:balance` | Check token balance |
| `npm run comment:test` | Test comment flow |
| `npm run tx:check` | Check transaction |

## Security Features

- **Reentrancy Guard**: `nonReentrant` modifier on state-changing functions
- **Access Control**: `onlyOwner` for admin functions
- **CEI Pattern**: Checks-Effects-Interactions in prize claiming
- **Single Active Game**: One game per token prevents conflicts
- **Safe Transfers**: IERC20 interface with allowance checks

## Game Mechanics Deep Dive

### Cost Calculation

```
cost = totalFunding / 10000

Example:
- Initial funding: 1,000,000 tokens
- Cost per comment: 100 tokens (0.01%)
```

### Timer Extension

Each comment extends the game:
```
newEndTime = block.timestamp + gameTime
```

### Prize Claiming

Only `lastCommentor` can claim after `block.timestamp > endTime`:
```solidity
require(block.timestamp > game.endTime, "Game still active");
require(msg.sender == game.lastCommentor, "Not winner");
require(!game.isClaimed, "Already claimed");
```

## Dependencies

**Production:**
- `@openzeppelin/contracts` ^5.4.0

**Development:**
- `hardhat` ^3.0.16
- `viem` ^2.40.2
- `chai` ^6.2.1
- `typescript` ^5.8

## Contract Addresses

### Formicarium Testnet

| Contract | Address |
|----------|---------|
| CommentGameV3 | `0x...` (set in deployment) |
| MockERC20 | `0x...` (set in deployment) |

---

**Squid Meme** - *Making meme coins fun again*
