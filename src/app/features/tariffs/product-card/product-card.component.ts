// product-card.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html'
})
export class ProductCardComponent {
  @Input()
  product!: { name: string; description: string; price: number; };
}
