import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TawkService {
  private tawkScriptLoaded = false;

  loadTawkScript(): void {
    if (!this.tawkScriptLoaded) {
      const s1 = document.createElement('script');
      s1.async = true;
      s1.src = 'https://embed.tawk.to/674076f94304e3196ae7186b/1id9t1gei';
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      document.head.appendChild(s1);
      this.tawkScriptLoaded = true;
    }
  }
}
