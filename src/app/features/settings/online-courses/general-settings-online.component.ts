import { Component } from '@angular/core';

@Component({
  selector: 'app-general-settings-online',
  templateUrl: './general-settings-online.component.html',
  styleUrls: ['./general-settings-online.component.css']
})
export class GeneralSettingsOnlineComponent {
  directions: string[] = ['General', 'Business'];
  newDirection: string = '';

  addDirection() {
    if (this.newDirection.trim()) {
      this.directions.push(this.newDirection.trim());
      this.newDirection = '';
    }
  }

  removeDirection(direction: string) {
    this.directions = this.directions.filter(d => d !== direction);
  }
}
