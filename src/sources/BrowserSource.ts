import { SourceManga, SourceChapter, SourcePage, MangaSource, SourceResponse, StaleResponse } from './types';
import { BrowserManager } from '../../electron/BrowserManager';
import * as cheerio from 'cheerio';

export abstract class BrowserSource implements MangaSource {
  abstract id: string;
  abstract name: string;
  abstract baseUrl: string;
  protected browserManager: BrowserManager | null = null;

  constructor(browserManager?: BrowserManager) {
    if (browserManager) {
      this.browserManager = browserManager;
    }
  }

  protected async fetchJSON(url: string, headers: any = {}): Promise<SourceResponse<any>> {
    // Context-aware fetch
    if (this.browserManager) {
      // Main process context
      return (this.browserManager as any).fetchJSON(url, headers);
    } else {
      // Renderer context
      return (window as any).electron.invoke('browser:fetch-json', { url, headers });
    }
  }

  protected async fetchHTML(url: string, headers: any = {}): Promise<string> {
    if (this.browserManager) {
      return (this.browserManager as any).fetchHTML(url, headers);
    } else {
      return (window as any).electron.invoke('browser:fetch-html', { url, headers });
    }
  }

  protected parseHTML(html: string) {
    return cheerio.load(html);
  }

  abstract search(query: string): Promise<SourceManga[]>;
  abstract getMangaDetails(mangaId: string): Promise<SourceManga>;
  abstract getChapters(mangaId: string): Promise<SourceChapter[]>;
  abstract getPages(chapterId: string): Promise<SourcePage[]>;

  protected isStale(response: any): response is StaleResponse {
    return response && response.__stale === true;
  }
}
