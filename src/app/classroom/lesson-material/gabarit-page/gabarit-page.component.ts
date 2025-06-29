import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-gabarit-page',
  templateUrl: './gabarit-page.component.html',
  styleUrls: ['./gabarit-page.component.css']
})
export class GabaritPageComponent implements OnInit {
  @Input() lesson: any;
  @Input() readonly = true;

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
}
