import { Component, OnInit } from '@angular/core';
import { SitemapService, SitemapUrl } from '../../../services/sitemap.service';
import { environment } from '../../../../../environment';

@Component({
  selector: 'app-sitemap-admin',
  template: `
    <div class="sitemap-admin">
      <h2>🔍 Sitemap & SEO Management</h2>
      
      <div class="card mb-4">
        <div class="card-header">
          <h5>📄 Current Sitemap URLs</h5>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Last Modified</th>
                  <th>Change Frequency</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let url of sitemapUrls">
                  <td>
                    <a [href]="url.loc" target="_blank" class="text-decoration-none">
                      {{ url.loc }}
                    </a>
                  </td>
                  <td>{{ url.lastmod }}</td>
                  <td>
                    <span class="badge bg-info">{{ url.changefreq }}</span>
                  </td>
                  <td>
                    <span class="badge bg-primary">{{ url.priority }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <h5>🤖 Google Search Console</h5>
        </div>
        <div class="card-body">
          <p><strong>Sitemap URL:</strong> <code>https://linguaconnect.com/sitemap.xml</code></p>
          <p><strong>Robots.txt URL:</strong> <code>https://linguaconnect.com/robots.txt</code></p>
          
          <div class="alert alert-warning">
            <h6>⚠️ Development Status - Live Domain Required</h6>
            <p><strong>Current Status:</strong> All SEO files are ready but Google Search Console requires a live domain.</p>
            <p><strong>Next Steps After Domain Goes Live:</strong></p>
            <ol>
              <li>Deploy application to production server</li>
              <li>Go to <a href="https://search.google.com/search-console" target="_blank">Google Search Console</a></li>
              <li>Add your property: <code>https://linguaconnect.com</code></li>
              <li>Verify ownership using HTML file or meta tag</li>
              <li>Submit sitemap: <code>https://linguaconnect.com/sitemap.xml</code></li>
              <li>Monitor indexing status and search performance</li>
            </ol>
          </div>

          <button class="btn btn-secondary" (click)="submitToSearchConsole()" disabled>
            ⏳ Ready for Production Deployment
          </button>
          <small class="text-muted d-block mt-2">
            This will be available after domain goes live
          </small>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h5>📈 SEO Metrics</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-3">
              <div class="text-center">
                <h3 class="text-primary">{{ sitemapUrls.length }}</h3>
                <p class="text-muted">Total URLs</p>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <h3 class="text-success">{{ highPriorityUrls }}</h3>
                <p class="text-muted">High Priority</p>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <h3 class="text-warning">{{ dailyUpdatedUrls }}</h3>
                <p class="text-muted">Daily Updated</p>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <h3 class="text-info">{{ lastUpdated }}</h3>
                <p class="text-muted">Last Updated</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sitemap-admin {
      padding: 20px;
    }
    .card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .badge {
      font-size: 0.8em;
    }
    .alert {
      border-left: 4px solid #17a2b8;
    }
  `]
})
export class SitemapAdminComponent implements OnInit {
  sitemapUrls: SitemapUrl[] = [];
  highPriorityUrls = 0;
  dailyUpdatedUrls = 0;
  lastUpdated = '';

  constructor(private sitemapService: SitemapService) {}

  ngOnInit(): void {
    this.loadSitemapData();
  }

  loadSitemapData(): void {
    this.sitemapService.generateDynamicSitemap().subscribe(urls => {
      this.sitemapUrls = urls;
      this.calculateMetrics();
    });
  }

  calculateMetrics(): void {
    this.highPriorityUrls = this.sitemapUrls.filter(url => url.priority >= 0.9).length;
    this.dailyUpdatedUrls = this.sitemapUrls.filter(url => url.changefreq === 'daily').length;
    this.lastUpdated = new Date().toLocaleDateString();
  }

  submitToSearchConsole(): void {
    this.sitemapService.submitToSearchConsole().subscribe(result => {
      if (!environment.production) {
        console.log('Search Console submission:', result);
      }
      alert('Sitemap URL logged for manual submission to Google Search Console');
    });
  }
}
