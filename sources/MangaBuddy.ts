import { BrowserSource } from '../src/sources/BrowserSource';
import { SourceManga, SourceChapter, SourcePage } from '../src/sources/types';
import { parseChapter } from '../src/utils/chapterParser';

export class MangaBuddy extends BrowserSource {
  id = 'mangabuddy';
  name = 'MangaBuddy';
  baseUrl = 'https://mangabuddy.com';

  private normalizeImageUrl(url: string): string {
    const raw = (url || '').trim();
    if (!raw) return '';
    if (raw.startsWith('//')) return `https:${raw}`;
    if (raw.startsWith('/')) return `${this.baseUrl}${raw}`;
    return raw;
  }

  private extractBestCoverUrl($: any): string {
    const candidates = [
      $('.book-info .img img').attr('data-src'),
      $('.book-info .img img').attr('src'),
      $('meta[property="og:image"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      $('img.cover').first().attr('data-src'),
      $('img.cover').first().attr('src'),
      $('img').first().attr('data-src'),
      $('img').first().attr('src')
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeImageUrl(candidate || '');
      if (normalized) return normalized;
    }
    return '';
  }

  private extractGenres($: any): string[] {
    const isLikelyGenre = (value: string): boolean => {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return false;
      if (normalized.length > 40) return false;

      const blockedTokens = [
        'read',
        'chapter',
        'chapters',
        'online',
        'free',
        'scan',
        'scans',
        'mangabuddy',
        'http',
        'www'
      ];

      if (blockedTokens.some((token) => normalized.includes(token))) return false;
      return true;
    };

    const splitGenres = (raw: string): string[] =>
      raw
        .split(/[,/;|]/g)
        .map((g) => g.trim())
        .filter((g) => isLikelyGenre(g));

    const fromAnchors = [
      ...$('.list-info li')
        .map((_: number, li: any) => {
          const rowText = $(li).text().trim();
          if (!/genre/i.test(rowText)) return [];
          return $(li)
            .find('a')
            .map((__: number, a: any) => $(a).text().trim())
            .get();
        })
        .get()
        .flat(),
      ...$('.book-details .detail .meta p')
        .map((_: number, p: any) => {
          const label = $(p).find('strong').first().text().trim();
          if (!/genre/i.test(label)) return [];
          return $(p)
            .find('a')
            .map((__: number, a: any) => $(a).text().trim())
            .get();
        })
        .get()
        .flat(),
      ...$('.genres a').map((_: number, el: any) => $(el).text().trim()).get(),
      ...$('.genre a').map((_: number, el: any) => $(el).text().trim()).get(),
      ...$('a[href*="/genre/"]').map((_: number, el: any) => $(el).text().trim()).get()
    ].filter((g: string) => isLikelyGenre(g));

    const fromLabelText = $('.list-info li, .book-info li, .post-content_item, .book-details .detail .meta p')
      .map((_: number, el: any) => {
        const text = $(el).text().trim();
        if (!/genre/i.test(text)) return [];
        const raw = text.replace(/genre\(s\)\s*:?/i, '').replace(/genres?\s*:?/i, '').trim();
        if (!raw) return [];
        return splitGenres(raw);
      })
      .get()
      .flat();

    const fromMeta = [
      ...$('meta[property="book:tag"]').map((_: number, el: any) => ($(el).attr('content') || '').trim()).get()
    ]
      .flatMap((raw: string) => splitGenres(raw));

    const fromLdJson: string[] = [];
    const pushGenreValue = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => pushGenreValue(entry));
        return;
      }
      if (typeof value === 'string') {
        fromLdJson.push(...splitGenres(value));
      }
    };

    $('script[type="application/ld+json"]').each((_: number, el: any) => {
      try {
        const jsonText = ($(el).html() || '').trim();
        if (!jsonText) return;
        const payload = JSON.parse(jsonText);
        pushGenreValue(payload?.genre);
        if (Array.isArray(payload?.['@graph'])) {
          payload['@graph'].forEach((entry: any) => pushGenreValue(entry?.genre));
        }
      } catch {
        // Ignore malformed JSON blocks
      }
    });

    return Array.from(
      new Set(
        [...fromAnchors, ...fromLabelText, ...fromMeta, ...fromLdJson]
          .map((g) => g.trim())
          .filter((g) => isLikelyGenre(g))
      )
    );
  }

  async search(query: string): Promise<SourceManga[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
    const html = await this.fetchHTML(url);
    const $ = this.parseHTML(html);

    return $('.book-detailed-item').map((_: number, el: any) => {
      const titleEl = $(el).find('.title a');
      const href = titleEl.attr('href') || '';
      const id = href.replace(/^\//, '');

      return {
        id,
        title: titleEl.text().trim(),
        coverUrl: this.normalizeImageUrl($(el).find('img').attr('data-src') || $(el).find('img').attr('src') || ''),
        description: $(el).find('.summary').text().trim()
      };
    }).get();
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const url = `${this.baseUrl}/${mangaId}`;
    const html = await this.fetchHTML(url);
    const $ = this.parseHTML(html);

    const coverUrl = this.extractBestCoverUrl($);

    const uniqueGenres = this.extractGenres($);

    return {
      id: mangaId,
      title: $('.name h1').text().trim(),
      coverUrl,
      description: $('#summary .content').text().trim(),
      author: $('.list-info li:contains("Author") a').text().trim() || $('.list-info li:contains("Authors") a').text().trim(),
      status: $('.list-info li:contains("Status")').text().replace('Status:', '').trim(),
      genres: uniqueGenres
    };
  }

  async getChapters(mangaId: string): Promise<SourceChapter[]> {
    const url = `${this.baseUrl}/api/manga/${mangaId}/chapters?source=detail`;
    const html = await this.fetchHTML(url);
    const $ = this.parseHTML(html);

    return $('#chapter-list li').map((_: number, el: any) => {
      const a = $(el).find('a');
      const href = a.attr('href') || '';
      const id = href.replace(/^\//, ''); // e.g., 'solo-leveling/chapter-1'
      const title = a.find('.chapter-name').text().trim() || a.text().trim();

      // Use Mihon-style parsing while keeping chapterNumber strictly numeric.
      const parsed = parseChapter({ id, title });

      return {
        id,
        title,
        chapterNumber: parsed.chapterNumber,
      };
    }).get();
  }

  async getPages(chapterId: string): Promise<SourcePage[]> {
    const url = `${this.baseUrl}/${chapterId}`;
    const html = await this.fetchHTML(url);

    // Extract chapImages from script
    const scriptRegex = /chapImages\s*=\s*'([^']+)'/;
    const match = html.match(scriptRegex);

    if (!match) {
      console.error('MangaBuddy: Could not find chapImages in script');
      return [];
    }

    const imagesStr = match[1];
    const images = imagesStr.split(',').filter(Boolean);

    return images.map((urlStr: string, index: number) => ({
      url: urlStr.startsWith('//') ? `https:${urlStr}` : urlStr,
      index
    }));
  }
}
