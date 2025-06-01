import { Review } from '../dashboard/shared/models/review.model';
export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    studentName: 'Ирина Петрова',
    rating: 5,
    comment: 'Очень помогла с подготовкой к DELF B2!',
    date: '2024-11-05'
  },
  {
    id: 'r2',
    studentName: 'Алексей Иванов',
    rating: 4,
    comment: 'Хороший преподаватель, но занятия немного быстрые.',
    date: '2024-12-12'
  }
];
