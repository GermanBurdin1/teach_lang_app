import { TeacherDetails } from './teacher-details.model';

export const MOCK_TEACHER_DETAILS: TeacherDetails[] = [
  {
    id: '1',
    name: 'Анна Дюпон',
    photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    specializations: ['DELF B2', 'Grammaire'],
    price: 25,
    rating: 4.8,
    bio: 'Я преподаватель с 10-летним опытом подготовки к экзаменам DELF и DALF. Помогаю студентам уверенно заговорить на французском и понять структуру экзамена.',
    experienceYears: 10,
    certificates: ['DALF C2', 'Alliance Française']
  },
  {
    id: '2',
    name: 'Пьер Лафонт',
    photoUrl: 'https://randomuser.me/api/portraits/men/46.jpg',
    specializations: ['DALF C1', 'Expression orale'],
    price: 30,
    rating: 4.6,
    bio: 'Работаю с учениками уровня B2–C2, фокус на разговорной практике и глубоком понимании экзаменационных критериев.',
    experienceYears: 7,
    certificates: ['DALF C1', 'Phonétique Avancée']
  }
];
