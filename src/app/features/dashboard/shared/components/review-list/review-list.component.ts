import { Component, Input } from '@angular/core';
import { Review } from '../../models/review.model';

// TODO : ajouter gestion de la pagination pour grandes listes d'avis
@Component({
  selector: 'app-review-list',
  templateUrl: './review-list.component.html',
  styleUrls: ['./review-list.component.css']
})
export class ReviewListComponent {
  @Input() reviews: Review[] = [];

  // TODO : ajouter méthodes pour tri et filtrage des avis
}
