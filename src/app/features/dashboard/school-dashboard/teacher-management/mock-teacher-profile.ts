import { TeacherProfile } from './teacher-profile.model';

export const MOCK_TEACHER_PROFILE: TeacherProfile = {
  id: '3',
  name: 'Люси Мартен',
  photoUrl: 'https://randomuser.me/api/portraits/women/55.jpg',
  specializations: ['DELF B1', 'Compréhension écrite'],
  price: 20,
  rating: 4.9,
  bio: 'Преподаю французский как иностранный более 5 лет. Специализируюсь на подготовке к DELF B1 и улучшении письменной речи.',
  experienceYears: 5,
  certificates: ['DELF B2', 'Alliance Française'],
  isActive: true,
  moderated: true,
  email: 'lucie.marten@example.com' 
};
