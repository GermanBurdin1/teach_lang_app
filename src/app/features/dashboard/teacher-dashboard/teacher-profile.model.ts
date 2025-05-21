export interface TeacherProfile {
  id: string;
  name: string;
  photoUrl: string;
  specializations: string[];
  price: number;
  rating: number;
  bio: string;
  experienceYears: number;
  certificates: string[];
  isActive: boolean;
  moderated: boolean;
  email: string;
  preferences: { language: string; theme: string };
}
