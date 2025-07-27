import { TeacherProfile } from './teacher-profile.model';

export const MOCK_TEACHER_PROFILE: TeacherProfile = {
  id: '3',
  name: 'Lucie Martin',
  photoUrl: 'https://randomuser.me/api/portraits/women/55.jpg',
  specializations: ['DELF B1', 'Compréhension écrite'],
  price: 20,
  rating: 4.9,
  bio: 'Enseigne le français langue étrangère depuis plus de 5 ans. Se spécialise dans la préparation au DELF B1 et l\'amélioration de l\'expression écrite.',
  experienceYears: 5,
  certificates: ['DELF B2', 'Alliance Française'],
  isActive: true,
  moderated: true,
  email: 'lucie.martin@example.com' 
};

// TODO : remplacer par des données dynamiques depuis l'API
