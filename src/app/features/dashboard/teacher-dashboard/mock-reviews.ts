import { Review } from '../shared/models/review.model';

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    studentName: 'Анна Иванова',
    rating: 5,
    comment: 'Превосходный преподаватель. Спасибо за помощь!',
    date: '2024-11-10'
  },
  {
    id: 'r2',
    studentName: 'Михаил Смирнов',
    rating: 4,
    comment: 'Занятия очень полезные, но хотелось бы больше практики.',
    date: '2025-01-15'
  },
  {
    id: 'r3',
    studentName: 'Елена Кузнецова',
    rating: 5,
    comment: 'Успешно сдала DELF B1 благодаря этим занятиям!',
    date: '2025-03-02'
  }
];

