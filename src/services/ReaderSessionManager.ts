/**
 * ReaderSessionManager
 * Implements the Mihon 'Single Snapshot' architecture.
 * Manages ephermal reading state and handles lifecycle-driven persistence.
 *
 * COMMIT GATES (when writes happen):
 *   1. Reader unmount (navigation away / close)
 *   2. Chapter change (auto-advance or manual next)
 *   3. App backgrounding (visibilitychange → hidden)
 *
 * NO WRITES DURING:
 *   - Scrolling / page turns
 *   - IntersectionObserver visibility updates
 *   - Preloading / prefetching
 */

interface SessionState {
  sourceId: string;
  mangaId: string;
  chapterId: string;
  page: number;
  total: number;
  dbId?: number;
  chapterNumber?: number;
}

interface FlushOptions {
  updateMasterChapter?: boolean;
}

class ReaderSessionManager {
  private state: SessionState | null = null;
  private isCommitting = false;
  private commitCount = 0;
  private pendingChapterCompletions = new Map<string, SessionState>();
  private lastCommittedByChapter = new Map<string, string>();
  private trackedMangaCache = new Map<string, number>();

  constructor() {
    // Listen for global flush requests from Main process (e.g. on app exit)
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.on('session:flush-request', async () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ReaderSessionManager] Flush request received from Main');
        }
        await this.commit();
        // Notify main that we are finished
        (window as any).electron.invoke('session:flush-finished');
      });
    }
  }

  /**
   * Initialize or update the active reading session snapshot.
   * This is a purely in-memory operation with zero I/O overhead.
   *
   * DEBUG: Watch for "ReaderSessionManager.update" in console to verify
   *        ephemeral state updates (should NOT trigger IPC writes)
   */
  update(update: SessionState) {
    this.state = update;
    if (process.env.NODE_ENV === 'development') {
      console.log('[ReaderSessionManager.update]',
        `Ch.${update.chapterNumber} Pg.${update.page}/${update.total}`,
        '(ephemeral - no IPC)'
      );
    }
  }

  /**
   * Commits a single snapshot of the current session to the persistent store.
   * Triggered strictly by lifecycle events: Chapter Exit, Chapter Jump, or App Backgrounding.
   *
   * DEDUPLICATION: Ensures we don't spam the DB if multiple lifecycle events fire
   *                at the same position (e.g. Pause -> Close).
   */
  async commit(onComplete?: () => Promise<void> | void) {
    if ((!this.state && this.pendingChapterCompletions.size === 0) || this.isCommitting) return;

    this.isCommitting = true;
    this.commitCount++;

    try {
      // Persist forced chapter completions first (chapter-local only).
      for (const completion of this.pendingChapterCompletions.values()) {
        const key = `${completion.mangaId}:${completion.chapterId}:${completion.page}`;
        if (this.lastCommittedByChapter.get(completion.chapterId) === key) continue;
        await this.flushToDB(completion, { updateMasterChapter: false });
        this.lastCommittedByChapter.set(completion.chapterId, key);
      }
      this.pendingChapterCompletions.clear();

      if (this.state) {
        const snapshot = { ...this.state };
        const key = `${snapshot.mangaId}:${snapshot.chapterId}:${snapshot.page}`;
        if (this.lastCommittedByChapter.get(snapshot.chapterId) !== key) {
          await this.flushToDB(snapshot, { updateMasterChapter: true });
          this.lastCommittedByChapter.set(snapshot.chapterId, key);
        }
      }
      
      if (onComplete) {
        await onComplete();
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[ReaderSessionManager.commit]', 'SUCCESS - snapshot persistent');
      }
    } catch (err) {
      console.error('ReaderSessionManager: Lifecycle commit failed', err);
    } finally {
      this.isCommitting = false;
    }
  }

  /**
   * Internal database orchestration.
   */
  private async flushToDB(snapshot: SessionState, options: FlushOptions = {}) {
    const shouldUpdateMaster = options.updateMasterChapter ?? true;

    // 1. Derive completion status ONLY at the moment of commit
    const progress = snapshot.total > 0 ? snapshot.page / snapshot.total : 0;
    const isCompleted = progress >= 0.95 ? 1 : 0;

    // 2. Persist chapter-specific positioning
    await (window as any).electron.invoke('manga:save-progress', {
      id_source: snapshot.sourceId,
      id_manga: snapshot.mangaId,
      id_chapter: snapshot.chapterId,
      progress: progress,
      current_page: snapshot.page,
      total_pages: snapshot.total,
      completed: isCompleted
    });

    // 3. Update master manga record if metadata exists.
    // Fallback lookup keeps library chapter sync working even when dbId was not passed by caller.
    let resolvedDbId = snapshot.dbId;
    if (!resolvedDbId) {
      const cacheKey = `${snapshot.sourceId}:${snapshot.mangaId}`;
      if (this.trackedMangaCache.has(cacheKey)) {
        resolvedDbId = this.trackedMangaCache.get(cacheKey);
      } else {
        const tracked = await (window as any).electron.invoke('manga:check-tracked', {
          id_source: snapshot.sourceId,
          id_manga: snapshot.mangaId
        });
        if (tracked?.id) {
          resolvedDbId = tracked.id;
          this.trackedMangaCache.set(cacheKey, tracked.id);
        }
      }
    }

    if (shouldUpdateMaster && resolvedDbId && typeof snapshot.chapterNumber === 'number') {
      await (window as any).electron.invoke('update-chapter', {
        id: resolvedDbId,
        chapter: snapshot.chapterNumber
      });
    }
  }

  /**
   * Standard lifecycle trigger for backgrounding/pause events.
   */
  async lifecycleCommit() {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ReaderSessionManager.lifecycleCommit]', 'visibilitychange → hidden detected');
    }
    await this.commit();
  }

  /**
   * Mark a chapter as completed once reader has clearly moved forward past it.
   * This is buffered and persisted on next commit gate.
   */
  markChapterCompleted(input: Omit<SessionState, 'page'> & { total: number }) {
    const totalPages = Math.max(1, input.total || 1);
    this.pendingChapterCompletions.set(input.chapterId, {
      ...input,
      page: totalPages,
      total: totalPages
    });
  }

  /**
   * DEBUG: Get current commit count for testing
   */
  getCommitCount(): number {
    return this.commitCount;
  }

  /**
   * DEBUG: Reset commit counter (for testing)
   */
  resetCommitCount(): void {
    this.commitCount = 0;
  }
}

export const sessionManager = new ReaderSessionManager();

// DEBUG: Expose to window for manual verification in DevTools console
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__DEBUG_SESSION_MANAGER = {
    getState: () => sessionManager['state'],
    getCommitCount: () => sessionManager.getCommitCount(),
    resetCommitCount: () => sessionManager.resetCommitCount(),
    forceCommit: async () => {
      console.log('[DEBUG] Forcing commit...');
      await sessionManager.commit();
      console.log('[DEBUG] Force commit complete');
    },
    help: () => {
      console.log(`
__DEBUG_SESSION_MANAGER - Reader Session Debug Tools

Methods:
  .getState()          - Current ephemeral state (null = no active session)
  .getCommitCount()    - Number of commits this session
  .resetCommitCount()  - Reset counter for testing
  .forceCommit()       - Manually trigger a commit (for testing)

Architecture:
  - update() → memory only (no IPC)
  - commit() → IPC writes to DB (manga:save-progress, update-chapter)
  - Commit gates: unmount, chapter change, visibilitychange→hidden
      `);
    }
  };
  console.log('[ReaderSessionManager] Debug tools exposed: window.__DEBUG_SESSION_MANAGER');
}
