// src/app/admin-dashboard/teachers/mock-admin-teacher-details.ts
import { AdminTeacherDetails } from "./admin-teacher-details.model";

export const MOCK_ADMIN_TEACHER_DETAILS: AdminTeacherDetails[] = [
  {
    id: '1',
    name: 'Анна Дюпон',
    photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    specializations: ['DELF B2', 'Grammaire'],
    price: 25,
    rating: 4.8,
    isActive: true,
    registrationDate: '2023-09-12',
    moderated: true,
    bio: 'Я преподаватель с 10-летним опытом подготовки к экзаменам DELF и DALF.',
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
    isActive: false,
    registrationDate: '2024-01-22',
    moderated: false,
    bio: 'Работаю с учениками уровня B2–C2, фокус на разговорной практике.',
    experienceYears: 7,
    certificates: ['DALF C1', 'Phonétique Avancée']
  }
];
