import { Component } from '@angular/core';

@Component({
  selector: 'app-balance-system',
  templateUrl: './balance-system.component.html',
  styleUrls: ['./balance-system.component.css']
})
export class BalanceSystemComponent {
  useBalanceSystem: boolean = false;
  payThroughPlatform: boolean = false;
  restrictEntryOnZeroBalance: boolean = true;
  cancellationPeriod: string = 'anytime';
  studentMessage: string = '';
  currency: string = 'RUB';
  activeTab: string = 'active';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
