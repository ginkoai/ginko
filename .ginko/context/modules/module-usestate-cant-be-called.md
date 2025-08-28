---
type: gotcha
tags: [react, state, hooks, useState]
area: /
created: 2025-08-27
updated: 2025-08-27
relevance: high
dependencies: [gotcha-react-hooks-must-follow]
---

# useState can't be called conditionally

## Context
This critical React rule was discovered while debugging inconsistent state behavior in dashboard components. When useState is called conditionally, React's internal hook ordering breaks, causing state to be associated with the wrong variables across re-renders. This leads to extremely difficult-to-debug issues where state values mysteriously swap or disappear.

## Technical Details
React maintains hooks state by call order, not by name or any other identifier. Each render must call exactly the same hooks in exactly the same order. When useState appears inside a conditional:
- First render: condition true → useState called → state slot 1 allocated
- Second render: condition false → useState NOT called → state slot 1 skipped
- React cannot reconcile the different hook counts and state becomes corrupted

The React Fiber reconciler depends on a linked list of hooks that must remain consistent across renders.

## Code Examples
```jsx
// ❌ WRONG: Conditional useState
function UserProfile({ isAdmin }) {
  if (isAdmin) {
    const [adminSettings, setAdminSettings] = useState({}); // ERROR!
  }
  const [profile, setProfile] = useState(null);
  // State corruption: profile might get adminSettings value!
}

// ✅ CORRECT: Always call useState, conditionally use the value
function UserProfile({ isAdmin }) {
  const [adminSettings, setAdminSettings] = useState({});
  const [profile, setProfile] = useState(null);
  
  if (!isAdmin) {
    // Simply don't use adminSettings for non-admins
    return <RegularProfile profile={profile} />;
  }
  
  return <AdminProfile profile={profile} settings={adminSettings} />;
}

// ❌ WRONG: Early return before hooks
function Dashboard({ user }) {
  if (!user) return <Login />; // ERROR: skips hooks below
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
}

// ✅ CORRECT: All hooks before any conditions
function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  if (!user) return <Login />;
  // ... rest of component
}
```

## Impact
- **Severity: Critical** - Causes unpredictable runtime errors
- **Performance**: Memory leaks from orphaned state
- **Debugging**: State corruption appears random and intermittent
- **User Experience**: Data loss, incorrect UI states, crashes
- **Testing**: Bugs may only appear after specific interaction sequences

## References
- React Docs: [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning#breaking-rules-of-hooks)
- React Source: [ReactFiberHooks implementation](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberHooks.js)
- ESLint Rule: `react-hooks/rules-of-hooks` catches this automatically
- Related files: `dashboard/src/components/*`, `dashboard/src/app/dashboard/*`

## Related Patterns
- Always declare all state at component top
- Use null/undefined initial values instead of conditional hooks
- Extract conditional logic into separate components
- Consider useReducer for complex conditional state logic