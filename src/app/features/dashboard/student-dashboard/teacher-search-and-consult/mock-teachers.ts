// src/app/student-dashboard/teacher-search/mock-teachers.ts

import { Teacher } from './teacher.model';

// добавим просто дубли с разными id и именами
export const MOCK_TEACHERS: Teacher[] = [
  {
    id: '1',
    name: 'Анна Дюпон',
    photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    specializations: ['DELF B2', 'Grammaire'],
    price: 25,
    rating: 4.8,
    experienceYears: 3,
    teachingLanguages: ['français', 'anglais'],
    reviewCount: 5
  },
  {
    id: '2',
    name: 'Пьер Лафонт',
    photoUrl: 'https://randomuser.me/api/portraits/men/46.jpg',
    specializations: ['DALF C1', 'Expression orale'],
    price: 30,
    rating: 4.6,
    experienceYears: 2,
    teachingLanguages: ['français', 'anglais']
  },
  {
    id: '3',
    name: 'Люси Мартен',
    photoUrl: 'https://randomuser.me/api/portraits/women/55.jpg',
    specializations: ['DELF B1', 'Compréhension écrite'],
    price: 20,
    rating: 4.9,
    experienceYears: 4,
    teachingLanguages: ['français', 'anglais']
  },
  {
    id: '4',
    name: 'Тома Белле',
    photoUrl: 'https://randomuser.me/api/portraits/men/33.jpg',
    specializations: ['Grammaire', 'Phonétique'],
    price: 22,
    rating: 4.7,
    experienceYears: 1,
    teachingLanguages: ['français', 'anglais'],
    reviewCount: 3
  },
  {
    id: '5',
    name: 'Мари Шевалье',
    photoUrl: 'https://randomuser.me/api/portraits/women/60.jpg',
    specializations: ['DALF', 'Culture française'],
    price: 28,
    rating: 4.9,
    experienceYears: 5
  },
  {
    id: '6',
    name: 'Жюль Дюмон',
    photoUrl: 'https://randomuser.me/api/portraits/men/38.jpg',
    specializations: ['DELF A2', 'Compréhension orale'],
    price: 18,
    rating: 4.5,
    experienceYears: 3
  },
  {
    id: '7',
    name: 'Софи Рено',
    photoUrl: 'https://randomuser.me/api/portraits/women/70.jpg',
    specializations: ['Grammaire', 'Conversation'],
    price: 26,
    rating: 4.6,
    experienceYears: 2
  },
  {
    id: '8',
    name: 'Алекс Леблан',
    photoUrl: 'https://randomuser.me/api/portraits/men/71.jpg',
    specializations: ['Prononciation', 'Phonétique'],
    price: 24,
    rating: 4.4,
    experienceYears: 4
  },
  {
    id: '9',
    name: 'Камилль Ноэль',
    photoUrl: 'https://randomuser.me/api/portraits/women/29.jpg',
    specializations: ['DELF B2', 'DALF C1'],
    price: 27,
    rating: 4.7,
    experienceYears: 3
  },
  {
    id: '10',
    name: 'Лоран Малле',
    photoUrl: 'https://randomuser.me/api/portraits/men/19.jpg',
    specializations: ['Grammaire', 'Culture'],
    price: 23,
    rating: 4.3,
    experienceYears: 2
  },
  {
    id: '11',
    name: 'Надин Жиро',
    photoUrl: 'https://randomuser.me/api/portraits/women/80.jpg',
    specializations: ['Orthographe', 'Expression écrite'],
    price: 25,
    rating: 4.9,
    experienceYears: 4,
    teachingLanguages: ['français', 'anglais'],
    reviewCount: 2
  },
  {
    id: '12',
    name: 'Бенжамен Арно',
    photoUrl: 'https://randomuser.me/api/portraits/men/87.jpg',
    specializations: ['DALF C2', 'Analyse de texte'],
    price: 35,
    rating: 5.0,
    experienceYears: 5
  }
];

