import { Component } from '@angular/core';

@Component({
  selector: 'app-access-control',
  templateUrl: './access-control.component.html',
  styleUrls: ['./access-control.component.css']
})
export class AccessControlComponent {
  showModal: boolean = false;
  activeTab: string = 'teachers';  // default tab is teachers

  openCreateGroupModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  selectTab(tab: string) {
    this.activeTab = tab;
  }
}
