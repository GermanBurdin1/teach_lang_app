import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingComponent } from './landing.component'; // Импортируйте ваш компонент

@NgModule({
  declarations: [
    LandingComponent // Объявите ваш компонент здесь
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LandingComponent // Экспортируйте, если этот компонент должен использоваться за пределами этого модуля
  ]
})
export class LandingModule { }
