import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TawkService {
  private tawkScriptLoaded = false;
  private tawkInitialized = false;

  loadTawkScript(): void {
    if (this.tawkScriptLoaded || this.tawkInitialized) {
      return;
    }

    try {
      // Инициализируем Tawk_API объект
      window.Tawk_API = window.Tawk_API || {} as any;
      window.Tawk_LoadStart = new Date();

      // Создаем и загружаем скрипт
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://embed.tawk.to/674076f94304e3196ae7186b/1id9t1gei';
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      
      // Добавляем обработчики событий
      script.onload = () => {
        this.tawkScriptLoaded = true;
        this.initializeTawk();
      };
      
      script.onerror = (error) => {
        console.error('Ошибка загрузки Tawk.to скрипта:', error);
        this.tawkScriptLoaded = false;
      };

      // Вставляем скрипт в head
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }

    } catch (error) {
      console.error('Ошибка при инициализации Tawk.to:', error);
    }
  }

  private initializeTawk(): void {
    try {
      // Ждем пока Tawk API будет доступен
      const checkTawk = setInterval(() => {
        if (window.Tawk_API && window.Tawk_API.isLoaded) {
          clearInterval(checkTawk);
          this.tawkInitialized = true;
          this.setupTawkConfiguration();
        }
      }, 100);

      // Таймаут на случай если Tawk не загрузится
      setTimeout(() => {
        clearInterval(checkTawk);
        if (!this.tawkInitialized) {
          console.warn('Tawk.to не инициализировался в течение 10 секунд');
        }
      }, 10000);

    } catch (error) {
      console.error('Ошибка при настройке Tawk.to:', error);
    }
  }

  private setupTawkConfiguration(): void {
    try {
      const Tawk_API = window.Tawk_API;
      
      if (Tawk_API) {
        // Отключаем автоматическое определение языка для предотвращения ошибок i18next
        Tawk_API.setAttributes({
          'hide_default_invite': false,
          'custom_launcher': 'show'
        });

        // Добавляем обработчик ошибок
        Tawk_API.onLoad = () => {
          console.log('Tawk.to успешно загружен');
        };

        Tawk_API.onError = (error: any) => {
          console.error('Ошибка Tawk.to:', error);
        };
      }
    } catch (error) {
      console.error('Ошибка при конфигурации Tawk.to:', error);
    }
  }

  // Метод для показа/скрытия чата
  showChat(): void {
    if (window.Tawk_API) {
      window.Tawk_API.showWidget();
    }
  }

  hideChat(): void {
    if (window.Tawk_API) {
      window.Tawk_API.hideWidget();
    }
  }

  // Метод для установки информации о пользователе
  setVisitorInfo(name: string, email: string): void {
    if (window.Tawk_API) {
      window.Tawk_API.setAttributes({
        'name': name,
        'email': email
      });
    }
  }
}
