export interface Teacher {
  id: string;
  name: string;
  photoUrl: string;
  specializations: string[];
  price: number;
  rating: number;
  experienceYears: number;
  teachingLanguages?: string[];
  reviewCount?: number;
  certificates?: string[];
  bio?: string;
}
