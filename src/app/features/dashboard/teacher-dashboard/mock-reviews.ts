import { Review } from '../shared/models/review.model';

export const MOCK_REVIEWS = [
  {
    id: 1,
    studentName: 'Anna Dubois',
    rating: 5,
    comment: 'Excellent professeur. Merci pour votre aide !',
    date: new Date('2024-01-15'),
    verified: true
  },
  {
    id: 2,
    studentName: 'Michel Martin',
    rating: 4,
    comment: 'Très bon cours, méthodologie claire.',
    date: new Date('2024-01-10'),
    verified: true
  },
  {
    id: 3,
    studentName: 'Sophie Leclerc',
    rating: 5,
    comment: 'Je recommande vivement ce professeur !',
    date: new Date('2024-01-05'),
    verified: false
  }
];

// TODO : remplacer par des données dynamiques depuis l'API

