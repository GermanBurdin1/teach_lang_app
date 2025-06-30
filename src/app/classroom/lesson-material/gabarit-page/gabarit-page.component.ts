import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-gabarit-page',
  templateUrl: './gabarit-page.component.html',
  styleUrls: ['./gabarit-page.component.css']
})
export class GabaritPageComponent implements OnInit, OnDestroy {
  @Input() lesson: any;
  @Input() readonly = true;
  @Input() lessonStarted = false;

  // События для родительского компонента
  @Output() openNotesEvent = new EventEmitter<{section: 'materials', itemId: string, itemText: string}>();
  @Output() addToHomeworkEvent = new EventEmitter<{type: string, materialTitle: string, materialId: string}>();

  // Hover management - улучшенная логика
  hoveredItem: string | null = null;
  hoveredPosition: 'above' | 'below' = 'below';
  
  // Улучшенная логика для кнопок действий
  private hideTimeout: any = null;
  private isHoveringActions = false;

  ngOnInit(): void {
    if (!this.lesson) {
      console.warn('⚠️ [GabaritPageComponent] No lesson data received');
    }
  }

  get texts() { return this.lesson?.texts || []; }
  get audios() { return this.lesson?.audios || []; }
  get videos() { return this.lesson?.videos || []; }

  // Helper method to check if a value is a string
  isString(value: any): boolean {
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
  getMaterialId(material: any): string {
    if (typeof material === 'string') {
      return material;
    }
    return material?.id || material?.title || material?.name || 'unknown';
  }

  // Helper method to get material title  
  getMaterialTitle(material: any): string {
    if (typeof material === 'string') {
      return this.getDisplayName(material);
    }
    return material?.title || material?.name || 'Matériau';
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

  // Add to homework method - передаем событие родительскому компоненту
  addToHomework(materialType: string, materialTitle: string, materialId: string) {
    console.log('📋 Adding to homework:', { materialType, materialTitle, materialId });
    this.addToHomeworkEvent.emit({ type: materialType, materialTitle, materialId });
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
