# Commit Trigger Verification Guide

This document explains how to verify that the Mihon-style commit architecture is working correctly.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│ READER (ephemeral) - React state + refs only                │
│ - currentPage, scroll position, page visibility             │
│ - sessionManager.update() → memory only, NO IPC             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ (on commit events ONLY)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ SESSION MANAGER (commit gate)                               │
│ Triggers: unmount, chapter change, visibility=hidden        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE (persistent)                                       │
│ - chapter_progress: per-chapter positioning                 │
│ - manga.current_chapter: library-level last read            │
└─────────────────────────────────────────────────────────────┘
```

## How to Verify Commit Triggers

### Step 1: Open DevTools Console

Launch the app and open the browser console (Ctrl+Shift+J or Cmd+Option+J).

### Step 2: Watch for Debug Logs

In development mode (`NODE_ENV=development`), you will see:

```
[ReaderSessionManager.update] Ch.1 Pg.5/20 (ephemeral - no IPC)
[ReaderSessionManager.update] Ch.1 Pg.6/20 (ephemeral - no IPC)
...
[ReaderSessionManager.commit] COMMIT #1 Ch.1 Pg.15/20 → IPC: manga:save-progress, update-chapter
[ReaderSessionManager.commit] SUCCESS - session finalized
```

### Step 3: Verify Expected Behavior

| Action | Expected Console Output |
|--------|------------------------|
| Scrolling through pages | Multiple `update()` logs, **NO** `commit()` logs |
| Closing reader (back button) | **Exactly ONE** `commit()` log |
| Auto-advance to next chapter | **ONE** `commit()` for current chapter, then new chapter loads |
| Manual "Next Chapter" button | **ONE** `commit()` for current chapter |
| Minimizing app (background) | `lifecycleCommit` detected, then **ONE** `commit()` log |

### Step 4: Use Debug Tools (Optional)

In the DevTools console, you can use:

```javascript
// Check current ephemeral state
window.__DEBUG_SESSION_MANAGER.getState()

// Check commit count
window.__DEBUG_SESSION_MANAGER.getCommitCount()

// Reset counter for fresh test
window.__DEBUG_SESSION_MANAGER.resetCommitCount()

// Force a commit manually (for testing)
await window.__DEBUG_SESSION_MANAGER.forceCommit()

// Show help
window.__DEBUG_SESSION_MANAGER.help()
```

## What NOT to See

If you see any of these, it's a **violation**:

- `commit()` logs while scrolling (should only see `update()`)
- Multiple `commit()` logs for a single chapter read
- `update-chapter` IPC calls from IntersectionObserver or scroll handlers
- Any database writes before reader unmount/chapter-change/background

## Manual Override Flows (Intentional Bypasses)

The following flows intentionally bypass the session manager:

1. **Detail view chapter +/- buttons**
   - Direct IPC: `update-chapter` → DB
   - This is a library edit, not a reading session

2. **Library view manual updates**
   - Direct IPC: `update-chapter` → DB
   - User is explicitly setting progress

These are **documented bypasses**, not violations. See:
- `src/pages/Detail.tsx:78-87` (commented)
- `src/App.tsx:234-240` (commented)

## Files to Audit

If you suspect a violation, check these files:

| File | What to look for |
|------|------------------|
| `src/pages/Reader.tsx` | Any `manga:save-progress` or `update-chapter` IPC calls outside of `sessionManager.commit()` |
| `src/services/ReaderSessionManager.ts` | Should be the ONLY place that calls these IPC methods |
| `electron/main.ts` | IPC handler definitions (should not trigger writes themselves) |

## Success Criteria

The architecture is compliant if:

- [ ] Scrolling produces zero IPC calls
- [ ] Each chapter read produces exactly one commit
- [ ] Commit happens on unmount, chapter change, or background only
- [ ] Preloading is read-only (cache only, no DB writes)
