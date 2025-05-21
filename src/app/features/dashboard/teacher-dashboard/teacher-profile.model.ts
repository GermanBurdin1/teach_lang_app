export interface TeacherProfile {
  user_id: string;
  full_name: string;
  photo_url: string;
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
