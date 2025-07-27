import { Review } from '../../shared/models/review.model';
export const MOCK_REVIEWS = [
  {
    id: 1,
    studentName: 'Irène Dubois',
    rating: 5,
    comment: 'Très aidée pour la préparation au DELF B2 !',
    date: new Date('2024-01-15'),
    verified: true
  },
  {
    id: 2,
    studentName: 'Alexandre Martin',
    rating: 4,
    comment: 'Bon professeur, mais les cours sont un peu rapides.',
    date: new Date('2024-01-10'),
    verified: true
  }
];

// TODO : remplacer par des données dynamiques depuis l'API
