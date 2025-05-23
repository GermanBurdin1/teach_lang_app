export interface StudentProfile {
  user_id: string;
  full_name: string;
  photo_url: string;
  bio?: string;
  isActive: boolean;
  moderated: boolean;
  email: string;
  preferences: { language: string; theme: string };
  availability?: { day: string; from: string; to: string }[];
}
