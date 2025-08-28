---
type: gotcha
tags: [react, hook, gotcha]
area: /
created: 2025-08-27
updated: 2025-08-27
relevance: high
dependencies: []
---

# React hooks must follow rules of hooks

## Context
This was discovered while working on React components in the Ginko dashboard. React hooks have strict rules that must be followed to ensure predictable behavior and prevent subtle bugs. Violations of these rules can lead to inconsistent state updates, memory leaks, and components that behave unpredictably across renders.

## Technical Details
React hooks must follow two fundamental rules:
1. **Only call hooks at the top level** - Never call hooks inside loops, conditions, or nested functions
2. **Only call hooks from React functions** - Either from React function components or custom hooks

The React reconciler relies on the order of hook calls to maintain state between renders. When this order changes, React cannot correctly associate state with hooks, leading to bugs.

## Code Examples
```typescript
// ❌ WRONG: Hook inside condition
function MyComponent({ shouldTrack }) {
  if (shouldTrack) {
    const [count, setCount] = useState(0); // Error: Conditional hook
  }
  // ...
}

// ✅ CORRECT: Hook at top level, conditional logic inside
function MyComponent({ shouldTrack }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (shouldTrack) {
      // Track logic here
    }
  }, [shouldTrack]);
  // ...
}

// ❌ WRONG: Hook inside loop
function ItemList({ items }) {
  items.forEach(item => {
    const [selected, setSelected] = useState(false); // Error: Hook in loop
  });
}

// ✅ CORRECT: Extract to component
function Item({ item }) {
  const [selected, setSelected] = useState(false);
  return <div>...</div>;
}

function ItemList({ items }) {
  return items.map(item => <Item key={item.id} item={item} />);
}
```

## Impact
- **Performance**: Incorrect hook usage can cause unnecessary re-renders and memory leaks
- **Reliability**: Components may work initially but fail after state changes
- **Debugging**: Hook order violations create bugs that are difficult to trace
- **Maintainability**: Following rules ensures consistent patterns across the codebase

## References
- React Documentation: [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)
- ESLint Plugin: eslint-plugin-react-hooks enforces these rules automatically
- Related files in project: dashboard/src/components/*, dashboard/src/hooks/*

## Related Patterns
- Custom hooks pattern for reusable logic
- Component composition over conditional rendering
- Effect cleanup patterns to prevent memory leaks