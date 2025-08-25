# Ginko Browser Extension - Testing Checklist

## Installation Test
- [ ] Extension loads in chrome://extensions/ without errors
- [ ] Icons appear correctly (or use text fallback)
- [ ] No permission warnings beyond expected ones

## Claude.ai Integration Test
1. Navigate to https://claude.ai
2. Click extension icon in toolbar
3. Verify:
   - [ ] Sidebar opens on the right
   - [ ] "Connected to Claude.ai" status shows
   - [ ] No console errors (F12 to check)

## Core Functionality Test
- [ ] **Start Session** button works
- [ ] Timer starts counting (00:00:01, 00:00:02...)
- [ ] **End Session** button stops timer
- [ ] Session data persists on page refresh

## Template System Test
- [ ] Click "Copy" on any template
- [ ] Verify clipboard contains template text
- [ ] Success notification appears

## Metrics Display Test
- [ ] Time saved shows realistic numbers
- [ ] Token estimates appear
- [ ] Weekly/Total session counts update

## CSP Compliance Test
1. Open DevTools Console (F12)
2. Look for any CSP violations
3. Verify:
   - [ ] No "Content Security Policy" errors
   - [ ] No "Refused to execute" messages
   - [ ] Extension operates smoothly

## Data Persistence Test
1. Start a session
2. Close and reopen sidebar
3. Verify:
   - [ ] Timer continues from where it left off
   - [ ] Metrics are preserved
   - [ ] Settings remain saved

## Expected Behavior
- Extension is **read-only** on Claude.ai
- All actions are **user-initiated** (no automation)
- Data stored **locally only** (check Application > Storage in DevTools)

## Known Limitations
- Icons may not display without running generate-icons.html first
- Clipboard read requires user gesture (security feature)
- Some features marked "Coming Soon" in UI

## Quick Fixes If Needed
- If extension doesn't load: Check for syntax errors in manifest.json
- If sidebar doesn't open: Ensure you're on claude.ai domain
- If timer doesn't work: Check browser console for JavaScript errors
- If templates don't copy: Verify clipboard permissions granted

## Success Criteria
✅ Extension installs without errors
✅ Sidebar appears on Claude.ai
✅ Basic session tracking works
✅ No CSP violations
✅ Templates copy to clipboard
✅ Data persists between sessions