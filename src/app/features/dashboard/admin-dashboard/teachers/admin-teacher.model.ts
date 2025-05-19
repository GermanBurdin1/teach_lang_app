export interface AdminTeacher {
  id: string;
  name: string;
  photoUrl: string;
  specializations: string[];
  price: number;
  rating: number;
  isActive: boolean;
  registrationDate: string;
  moderated: boolean;
}
