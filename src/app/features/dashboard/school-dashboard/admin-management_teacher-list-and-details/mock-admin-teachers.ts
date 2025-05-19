import { AdminTeacher } from './admin-teacher.model';

export const MOCK_TEACHERS_ADMIN: AdminTeacher[] = [
  {
    id: '1',
    name: 'Анна Дюпон',
    photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    specializations: ['DELF B2', 'Grammaire'],
    price: 25,
    rating: 4.8,
    isActive: true,
    registrationDate: '2023-09-12',
    moderated: true
  },
  {
    id: '2',
    name: 'Пьер Лафонт',
    photoUrl: 'https://randomuser.me/api/portraits/men/46.jpg',
    specializations: ['DALF C1', 'Expression orale'],
    price: 30,
    rating: 4.6,
    isActive: false,
    registrationDate: '2024-01-22',
    moderated: false
  },
  {
    id: '3',
    name: 'Люси Мартен',
    photoUrl: 'https://randomuser.me/api/portraits/women/55.jpg',
    specializations: ['DELF B1', 'Compréhension écrite'],
    price: 20,
    rating: 4.9,
    isActive: true,
    registrationDate: '2023-06-15',
    moderated: true
  },
  {
    id: '4',
    name: 'Тома Белле',
    photoUrl: 'https://randomuser.me/api/portraits/men/33.jpg',
    specializations: ['Grammaire', 'Phonétique'],
    price: 22,
    rating: 4.7,
    isActive: true,
    registrationDate: '2022-12-05',
    moderated: false
  },
  {
    id: '5',
    name: 'Мари Шевалье',
    photoUrl: 'https://randomuser.me/api/portraits/women/60.jpg',
    specializations: ['DALF', 'Culture française'],
    price: 28,
    rating: 4.9,
    isActive: true,
    registrationDate: '2023-10-08',
    moderated: true
  },
  {
    id: '6',
    name: 'Жюль Дюмон',
    photoUrl: 'https://randomuser.me/api/portraits/men/38.jpg',
    specializations: ['DELF A2', 'Compréhension orale'],
    price: 18,
    rating: 4.5,
    isActive: true,
    registrationDate: '2024-02-01',
    moderated: false
  },
  {
    id: '7',
    name: 'Софи Рено',
    photoUrl: 'https://randomuser.me/api/portraits/women/70.jpg',
    specializations: ['Grammaire', 'Conversation'],
    price: 26,
    rating: 4.6,
    isActive: true,
    registrationDate: '2022-08-19',
    moderated: true
  },
  {
    id: '8',
    name: 'Алекс Леблан',
    photoUrl: 'https://randomuser.me/api/portraits/men/71.jpg',
    specializations: ['Prononciation', 'Phonétique'],
    price: 24,
    rating: 4.4,
    isActive: false,
    registrationDate: '2023-05-17',
    moderated: true
  },
  {
    id: '9',
    name: 'Камилль Ноэль',
    photoUrl: 'https://randomuser.me/api/portraits/women/29.jpg',
    specializations: ['DELF B2', 'DALF C1'],
    price: 27,
    rating: 4.7,
    isActive: true,
    registrationDate: '2023-11-03',
    moderated: false
  },
  {
    id: '10',
    name: 'Лоран Малле',
    photoUrl: 'https://randomuser.me/api/portraits/men/19.jpg',
    specializations: ['Grammaire', 'Culture'],
    price: 23,
    rating: 4.3,
    isActive: true,
    registrationDate: '2022-07-14',
    moderated: true
  },
  {
    id: '11',
    name: 'Надин Жиро',
    photoUrl: 'https://randomuser.me/api/portraits/women/80.jpg',
    specializations: ['Orthographe', 'Expression écrite'],
    price: 25,
    rating: 4.9,
    isActive: true,
    registrationDate: '2024-03-10',
    moderated: true
  },
  {
    id: '12',
    name: 'Бенжамен Арно',
    photoUrl: 'https://randomuser.me/api/portraits/men/87.jpg',
    specializations: ['DALF C2', 'Analyse de texte'],
    price: 35,
    rating: 5.0,
    isActive: true,
    registrationDate: '2024-04-01',
    moderated: false
  }
];
