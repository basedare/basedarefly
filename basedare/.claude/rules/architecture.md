# Architecture Rules

## Core Flow

1. **Backer funds bounty** → Frontend calls `fundBounty()` on BaseDareBounty contract
2. **Creator completes dare** → Uploads video proof via `/api/upload`
3. **AI Referee verifies** → Backend calls `verifyAndPayout()` with REFEREE_PRIVATE_KEY
4. **Payout splits**: 89% creator, 10% platform, 1% referrer

## Contract Interaction Pattern

Always use Viem/Wagmi for contract calls:
- **Read operations**: Use `publicClient` from `lib/contracts.ts`
- **Write operations**: Use hooks from `hooks/` (e.g., `useBountyFund`)
- **Server-side writes**: Use `getWalletClient()` with referee key

## Component Organization

- **Page components**: `app/[route]/page.tsx` - minimal, compose from components
- **Feature components**: `components/` root - full features (LiveBounties, HallOfShame)
- **UI primitives**: `components/ui/` - buttons, inputs, cards (shadcn/radix based)
- **Effects/visuals**: Components with "Background", "Effect", "Aura" in name are decorative

## State Management

- **Wallet state**: Wagmi hooks (`useAccount`, `useConnect`, `useWriteContract`)
- **Server state**: TanStack Query via API routes
- **App state**: IgnitionProvider context for protocol initialization
- **No Redux** - keep state local or use context sparingly

## API Route Conventions

```typescript
// Always return consistent shape
return NextResponse.json({ success: true, data: result });
return NextResponse.json({ success: false, error: message }, { status: 4xx });
```

## File Naming

- Components: PascalCase (`LiveBountyCard.tsx`)
- Hooks: camelCase with `use` prefix (`useBountyFund.ts`)
- Utils/lib: camelCase (`contracts.ts`)
- CSS modules: Match component name (`HoloProfileCard.css`)
Architecture Details: See @.claude/rules/architecture.md for full stack, state management, and file naming conventions.