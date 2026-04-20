import { BrowserWindow } from 'electron';

export class BrowserManager {
  public lockFetchGate: boolean = false;
  public navigationQueued: boolean = false;
  public activeFetches: number = 0;
  public navVersion: number = 0;
  private win: BrowserWindow;
  private fallbackQueue: Promise<void> = Promise.resolve();
  private createWindowFn?: () => BrowserWindow;
  private recreatingWindow = false;

  constructor(win: BrowserWindow, createWindowFn?: () => BrowserWindow) {
    this.win = win;
    this.createWindowFn = createWindowFn;
    this.attachWindowGuards(this.win);
  }



  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  private ensureWindow(): BrowserWindow {
    if (!this.win || this.win.isDestroyed()) {
      if (!this.createWindowFn) {
        throw new Error('BrowserManager: scraper window unavailable and no factory provided');
      }
      this.win = this.createWindowFn();
      this.attachWindowGuards(this.win);
      console.warn('BrowserManager: Scraper window recreated on demand.');
    }
    if (this.win.webContents.isCrashed()) {
      throw new Error('BrowserManager: scraper window is crashed');
    }
    return this.win;
  }

  private attachWindowGuards(window: BrowserWindow) {
    const wc = window.webContents;
    wc.on('render-process-gone', (_event, details) => {
      console.error(`BrowserManager: Scraper renderer gone (${details.reason})`);
      void this.recreateScraperWindow(`render-process-gone (${details.reason})`);
    });
  }

  private async recreateScraperWindow(reason: string): Promise<void> {
    if (this.recreatingWindow) return;
    this.recreatingWindow = true;
    console.error(`BrowserManager: Recreating scraper window due to ${reason}`);
    try {
      if (!this.createWindowFn) return;
      try {
        if (this.win && !this.win.isDestroyed()) {
          this.win.destroy();
        }
      } catch (e: any) {
        console.error('BrowserManager: Failed to destroy old scraper window:', e?.message || e);
      }

      this.win = this.createWindowFn();
      this.attachWindowGuards(this.win);
      this.lockFetchGate = false;
      this.navigationQueued = false;
      this.activeFetches = 0;
      this.navVersion++;
    } finally {
      this.recreatingWindow = false;
    }
  }

  private async navigateWithReadiness(url: string, timeoutMs: number, windowOverride?: BrowserWindow): Promise<void> {
    const window = windowOverride || this.ensureWindow();
    const wc = window.webContents;

    const readiness = new Promise<void>((resolve, reject) => {
      let settled = false;
      const finalize = (cb: () => void) => {
        if (!settled) {
          settled = true;
          cleanup();
          cb();
        }
      };

      const onDomReady = () => finalize(() => resolve());
      const onDidFinishLoad = () => finalize(() => resolve());
      const onDidFailLoad = (_event: unknown, errorCode: number, errorDescription: string) =>
        finalize(() => reject(new Error(`did-fail-load ${errorCode}: ${errorDescription}`)));

      const cleanup = () => {
        wc.removeListener('dom-ready', onDomReady);
        wc.removeListener('did-finish-load', onDidFinishLoad);
        wc.removeListener('did-fail-load', onDidFailLoad);
      };

      wc.on('dom-ready', onDomReady);
      wc.on('did-finish-load', onDidFinishLoad);
      wc.on('did-fail-load', onDidFailLoad);
    });

    try {
      await this.withTimeout(
        Promise.all([window.loadURL(url), readiness]).then(() => undefined),
        timeoutMs,
        `Navigation timeout for ${url}`
      );
    } catch (err) {
      // Cancel hanging navigation and propagate explicit timeout/failure.
      wc.stop();
      throw err;
    }
  }



  async waitForNavigation() {
    while (this.lockFetchGate || this.navigationQueued) {
      await this.delay(50);
    }
  }

  async waitForFetches() {
    while (this.activeFetches > 0) {
      await this.delay(50);
    }
  }

  async navigate(url: string) {
    const window = this.ensureWindow();
    console.log(`BrowserManager: Navigating to ${url}...`);
    this.navigationQueued = true;
    this.lockFetchGate = true;

    try {
      await Promise.race([
        this.waitForFetches(),
        this.delay(5000)
      ]);

      this.navVersion++;
      console.log(`BrowserManager: Version incremented to ${this.navVersion}`);
      await this.navigateWithReadiness(url, 10000);
      await this.delay(200);
      console.log(`BrowserManager: Navigation to ${url} complete.`);
    } catch (err: any) {
      console.error(`BrowserManager: Navigation to ${url} failed:`, err?.message || err);
      await this.recreateScraperWindow(`navigation failure for ${url}`);
      throw err;
    } finally {
      this.lockFetchGate = false;
      this.navigationQueued = false;
    }
  }

  async fetchJSON(url: string, headers: any = {}) {
    const window = this.ensureWindow();
    const currentVersion = this.navVersion;
    console.log(`BrowserManager: Fetch started for ${url} (target version: ${currentVersion})`);

    if (this.lockFetchGate) {
      await this.waitForNavigation();
    }

    this.activeFetches++;

    try {
      const result = await window.webContents.executeJavaScript(
        `(async ([u, h]) => {
          try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(u, {
              credentials: "include",
              headers: { "Accept": "application/json", ...h },
              signal: controller.signal
            });
            clearTimeout(t);
            if (!res.ok) return { __error: "HTTP " + res.status };
            const data = await res.json();
            return { __success: true, data };
          } catch (e) {
            return { __error: e.message };
          }
        })(${JSON.stringify([url, headers])})`,
        true
      );

      if (result.__error) throw new Error(result.__error);

      if (this.navVersion !== currentVersion) {
        console.warn(`BrowserManager: Fetch for ${url} discarded (Version mismatch: ${this.navVersion} !== ${currentVersion})`);
        return { __stale: true };
      }

      console.log(`BrowserManager: Fetch for ${url} succeeded.`);
      return result.data;
    } catch (err: any) {
      console.error(`BrowserManager: Fetch for ${url} failed:`, err.message);
      throw err;
    } finally {
      this.activeFetches = Math.max(0, this.activeFetches - 1);
    }
  }

  async fetchHTML(url: string, headers: any = {}): Promise<string> {
    const window = this.ensureWindow();
    const currentVersion = this.navVersion;
    console.log(`BrowserManager: HTML fetch (non-blocking) started for ${url} (target version: ${currentVersion})`);

    if (this.lockFetchGate) {
      await this.waitForNavigation();
    }

    this.activeFetches++;

    try {
      const result = await window.webContents.executeJavaScript(
        `(async ([u, h]) => {
          try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(u, {
              credentials: "include",
              headers: { "Accept": "text/html", ...h },
              signal: controller.signal
            });
            clearTimeout(t);
            if (!res.ok) return { __error: "HTTP " + res.status };
            const data = await res.text();
            return { __success: true, data };
          } catch (e) {
            return { __error: e.message };
          }
        })(${JSON.stringify([url, headers])})`,
        true
      );

      if (result.__error) throw new Error(result.__error);

      if (this.navVersion !== currentVersion) {
        console.warn(`BrowserManager: HTML fetch for ${url} discarded (Version mismatch: ${this.navVersion} !== ${currentVersion})`);
        return '';
      }

      console.log(`BrowserManager: HTML fetch for ${url} succeeded.`);
      return result.data;
    } catch (err: any) {
      console.error(`BrowserManager: HTML fetch for ${url} failed:`, err.message);
      throw err;
    } finally {
      this.activeFetches = Math.max(0, this.activeFetches - 1);
    }
  }
}
