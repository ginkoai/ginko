# Focus Page Components

React components for the Ginko dashboard Focus page, designed to provide motivational continuity and team activity visibility.

## Components

### LastSessionSummary

Shows a brief summary of what happened in the last session to provide motivational continuity.

**Features:**
- Displays time since last session
- Shows 1-3 key accomplishments (prioritizes high-impact achievements/features/fixes)
- Shows total event count
- Compact 2-3 line design
- Handles empty state gracefully

**Usage:**
```tsx
import { LastSessionSummary } from '@/components/focus';

export default function FocusPage() {
  return <LastSessionSummary userId="user@example.com" graphId="gin_xxx" />;
}
```

**Props:**
- `userId` (optional): User ID to filter sessions
- `graphId` (optional): Graph ID to query (defaults to global default)

---

### RecentCompletions

Shows a team activity feed of recent completions to motivate accomplishments.

**Features:**
- Queries events with category `achievement`, `feature`, `fix` from last 7 days
- Queries Tasks with `status='complete'` and recent `updated_at`
- Displays as timeline/list with checkmark icons
- User attribution with current user highlighting
- Relative time ("2h ago", "yesterday")
- Limited to 5-7 items
- Handles loading and empty states

**Usage:**
```tsx
import { RecentCompletions } from '@/components/focus';

export default function FocusPage() {
  return <RecentCompletions userId="user@example.com" graphId="gin_xxx" />;
}
```

**Props:**
- `userId` (optional): Current user's ID to highlight their completions
- `graphId` (optional): Graph ID to query (defaults to global default)

---

## Example: Focus Page Layout

```tsx
'use client';

import { LastSessionSummary, RecentCompletions } from '@/components/focus';
import { useUser } from '@/hooks/use-user'; // Your auth hook
import { getDefaultGraphId } from '@/lib/graph/api-client';

export default function FocusPage() {
  const { user } = useUser();
  const graphId = getDefaultGraphId();

  return (
    <div className="space-y-6 p-6">
      {/* Last session summary - motivational continuity */}
      <LastSessionSummary userId={user?.email} graphId={graphId} />

      {/* Recent team completions - activity feed */}
      <RecentCompletions userId={user?.email} graphId={graphId} />

      {/* Other focus page components... */}
    </div>
  );
}
```

## Data Sources

### LastSessionSummary
- **API:** `/api/v1/sessions?graphId={id}&userId={user}&limit=1&days=14`
- **Returns:** Most recent session with events

### RecentCompletions
- **APIs:**
  - `/api/v1/graph/nodes?labels=Task&limit=50` - Completed tasks
  - `/api/v1/sessions?graphId={id}&limit=50&days=7` - Recent events
- **Filters:** Events with `category` in `['achievement', 'feature', 'fix']` and `impact='high'`

## Styling

Both components follow the Ginko dashboard design system:
- Uses existing UI components (`Card`, `Badge`, `LoadingSpinner`)
- Compact list design with subtle timestamps
- Current user's items slightly highlighted with `bg-primary/5` and `border-primary/20`
- Follows Ginko color palette (green accent: `#C1F500`, dark backgrounds)
- Responsive and accessible

## ADR-002 Compliance

Both components include proper frontmatter:
```typescript
/**
 * @fileType: component
 * @status: current
 * @updated: YYYY-MM-DD
 * @tags: [focus, relevant, keywords]
 * @related: [connected-files.tsx]
 * @priority: medium
 * @complexity: low|medium
 * @dependencies: [react, date-fns, heroicons]
 */
```
