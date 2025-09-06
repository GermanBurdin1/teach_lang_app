import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

@Injectable({
  providedIn: 'root'
})
export class SitemapService {
  private baseUrl = 'https://linguaconnect.com';

  constructor(private http: HttpClient) {}

  /**
   * Generate dynamic sitemap for lessons and classrooms
   */
  generateDynamicSitemap(): Observable<SitemapUrl[]> {
    const urls: SitemapUrl[] = [
      // Static pages
      {
        loc: `${this.baseUrl}/`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: 1.0
      },
      {
        loc: `${this.baseUrl}/login`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: `${this.baseUrl}/register`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: `${this.baseUrl}/about`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: 0.6
      },
      // Dashboard pages
      {
        loc: `${this.baseUrl}/cabinet/student`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.9
      },
      {
        loc: `${this.baseUrl}/cabinet/teacher`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.9
      },
      // Feature pages
      {
        loc: `${this.baseUrl}/lessons`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: 0.9
      },
      {
        loc: `${this.baseUrl}/classroom`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: 0.8
      },
      {
        loc: `${this.baseUrl}/mindmap`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7
      }
    ];

    return of(urls);
  }

  /**
   * Generate sitemap XML content
   */
  generateSitemapXML(): Observable<string> {
    return new Observable(observer => {
      this.generateDynamicSitemap().subscribe(urls => {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        urls.forEach(url => {
          xml += '  <url>\n';
          xml += `    <loc>${url.loc}</loc>\n`;
          xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
          xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
          xml += `    <priority>${url.priority}</priority>\n`;
          xml += '  </url>\n';
        });

        xml += '</urlset>';
        observer.next(xml);
        observer.complete();
      });
    });
  }

  /**
   * Submit sitemap to Google Search Console
   * Note: Requires live domain - currently in development mode
   */
  submitToSearchConsole(): Observable<any> {
    // This would typically be done server-side
    // For now, we'll just log the sitemap URL for future use
    console.log('Sitemap URL for Search Console:', `${this.baseUrl}/sitemap.xml`);
    console.log('⚠️ Note: Google Search Console requires a live domain to function');
    
    return of({ 
      success: true, 
      message: 'Sitemap URL logged for manual submission after domain goes live',
      status: 'development',
      nextSteps: [
        'Deploy to production server',
        'Verify domain ownership in Google Search Console',
        'Submit sitemap URL for indexing'
      ]
    });
  }
}
