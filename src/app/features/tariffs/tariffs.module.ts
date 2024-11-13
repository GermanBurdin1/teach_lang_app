import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TariffsComponent } from './tariffs.component';
import { BalanceComponent } from './balance/balance.component';
import { TariffStatusComponent } from './tariff-status/tariff-status.component';
import { ProductCardComponent } from './product-card/product-card.component';
import { AdditionalServicesComponent } from './additional-services/additional-services.component';
import { TariffModalComponent } from './tariff-status/tariff-modal/tariff-modal.component';

@NgModule({
  declarations: [
    TariffModalComponent,
    TariffsComponent,
    BalanceComponent,
    TariffStatusComponent,
    ProductCardComponent,
    AdditionalServicesComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    TariffsComponent,
    TariffStatusComponent,
    TariffModalComponent
  ]
})
export class TariffsModule { }
