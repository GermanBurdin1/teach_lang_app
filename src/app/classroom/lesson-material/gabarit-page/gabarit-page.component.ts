import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-gabarit-page',
  templateUrl: './gabarit-page.component.html',
  styleUrls: ['./gabarit-page.component.css']
})
export class GabaritPageComponent implements OnInit, OnDestroy {
  @Input() lesson: { texts?: unknown[]; audios?: unknown[]; videos?: unknown[]; [key: string]: unknown } | null = null;
  @Input() readonly = true;
  @Input() lessonStarted = false;

  // События для родительского компонента
  @Output() openNotesEvent = new EventEmitter<{section: 'materials', itemId: string, itemText: string}>();

  // Hover management - улучшенная логика
  hoveredItem: string | null = null;
  hoveredPosition: 'above' | 'below' = 'below';
  
  // Улучшенная логика для кнопок действий
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private isHoveringActions = false;

  ngOnInit(): void {
    if (!this.lesson) {
      console.warn('⚠️ [GabaritPageComponent] No lesson data received');
    }
  }

  get texts() { return this.lesson?.['texts'] || []; }
  get audios() { return this.lesson?.['audios'] || []; }
  get videos() { return this.lesson?.['videos'] || []; }

  // Helper method for lesson date
  getLessonDate(): Date | null {
    if (!this.lesson) return null;
    const date = (this.lesson as { date?: string | Date }).date;
    return date ? new Date(date) : null;
  }

  // Helper method to check if a value is a string
  isString(value: unknown): boolean {
    return typeof value === 'string';
  }

  // Helper method to check if a string is an audio URL
  isAudioUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const lowerUrl = url.toLowerCase();
    return audioExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('audio');
  }

  // Helper method to check if a string is a video URL
  isVideoUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('video');
  }

  // Helper method to get display name from URL or string
  getDisplayName(item: string): string {
    if (!item || typeof item !== 'string') return 'Matériau';
    
    // If it's a URL, extract filename
    if (item.includes('/')) {
      const parts = item.split('/');
      const filename = parts[parts.length - 1];
      
      // If filename has extension, remove it for cleaner display
      if (filename.includes('.')) {
        const nameParts = filename.split('.');
        nameParts.pop(); // Remove extension
        return nameParts.join('.') || filename;
      }
      
      return filename || 'Matériau';
    }
    
    // If it's not a URL, return as is (but limit length)
    return item.length > 50 ? item.substring(0, 47) + '...' : item;
  }

  // Helper method to get material identifier
  getMaterialId(material: unknown): string {
    if (typeof material === 'string') {
      return material;
    }
    const obj = material as { id?: string; title?: string; name?: string };
    return obj?.id || obj?.title || obj?.name || 'unknown';
  }

  // Helper method to get material title  
  getMaterialTitle(material: unknown): string {
    if (typeof material === 'string') {
      return this.getDisplayName(material);
    }
    const obj = material as { title?: string; name?: string };
    return obj?.title || obj?.name || 'Matériau';
  }

  // Helper methods for template property access
  getItemTitle(item: unknown): string {
    const obj = item as { title?: string; name?: string };
    return obj?.title || obj?.name || '';
  }

  getItemName(item: unknown): string {
    const obj = item as { name?: string };
    return obj?.name || '';
  }

  getItemDescription(item: unknown): string {
    const obj = item as { description?: string };
    return obj?.description || '';
  }

  getItemContent(item: unknown): string {
    const obj = item as { content?: string };
    return obj?.content || '';
  }

  getItemUrl(item: unknown): string {
    const obj = item as { url?: string };
    return obj?.url || '';
  }

  hasItemDescription(item: unknown): boolean {
    const obj = item as { description?: string };
    return !!(obj?.description);
  }

  hasItemContent(item: unknown): boolean {
    const obj = item as { content?: string };
    return !!(obj?.content);
  }

  hasItemUrl(item: unknown): boolean {
    const obj = item as { url?: string };
    return !!(obj?.url);
  }

  // Helper methods for safe display name calls
  getDisplayNameSafe(item: unknown): string {
    if (typeof item === 'string') {
      return this.getDisplayName(item);
    }
    return 'Matériau';
  }

  // Helper methods for safe audio/video URL checks
  isAudioUrlSafe(item: unknown): boolean {
    if (typeof item === 'string') {
      return this.isAudioUrl(item);
    }
    const obj = item as { url?: string; content?: string };
    if (obj?.url && typeof obj.url === 'string') {
      return this.isAudioUrl(obj.url);
    }
    if (obj?.content && typeof obj.content === 'string') {
      return this.isAudioUrl(obj.content);
    }
    return false;
  }

  isVideoUrlSafe(item: unknown): boolean {
    if (typeof item === 'string') {
      return this.isVideoUrl(item);
    }
    const obj = item as { url?: string; content?: string };
    if (obj?.url && typeof obj.url === 'string') {
      return this.isVideoUrl(obj.url);
    }
    if (obj?.content && typeof obj.content === 'string') {
      return this.isVideoUrl(obj.content);
    }
    return false;
  }

  // Hover management - улучшенная логика
  onHover(materialTitle: string, event: MouseEvent) {
    // Отменяем любой существующий таймер скрытия
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    this.hoveredItem = materialTitle;
    
    // Determine position based on viewport
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    this.hoveredPosition = rect.bottom > viewportHeight * 0.7 ? 'above' : 'below';
  }

  onLeaveItem() {
    // Задержка перед скрытием кнопок
    this.hideTimeout = setTimeout(() => {
      if (!this.isHoveringActions) {
        this.hoveredItem = null;
      }
    }, 300); // 300ms задержка
  }

  onEnterActions() {
    // Отменяем скрытие при наведении на кнопки
    this.isHoveringActions = true;
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  onLeaveActions() {
    // Скрываем кнопки с небольшой задержкой при уходе с кнопок
    this.isHoveringActions = false;
    this.hideTimeout = setTimeout(() => {
      this.hoveredItem = null;
    }, 100); // 100ms задержка при уходе с кнопок
  }

  ngOnDestroy(): void {
    // Очищаем таймер если он существует
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }



  // Open notes method - передаем событие родительскому компоненту
  openNotes(materialId: string, materialTitle: string) {
    console.log('📝 Opening notes for material:', { materialId, materialTitle });
    this.openNotesEvent.emit({ 
      section: 'materials', 
      itemId: materialId, 
      itemText: materialTitle 
    });
  }
}
