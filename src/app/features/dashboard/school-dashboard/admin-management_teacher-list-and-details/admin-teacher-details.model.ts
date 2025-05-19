// src/app/admin-dashboard/teachers/admin-teacher-details.model.ts
export interface AdminTeacherDetails {
  id: string;
  name: string;
  photoUrl: string;
  specializations: string[];
  price: number;
  rating: number;
  isActive: boolean;
  registrationDate: string;
  moderated: boolean;
  bio: string;
  experienceYears: number;
  certificates: string[];
}
