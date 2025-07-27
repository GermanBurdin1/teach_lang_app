export interface Review {
  id: string;
  studentName: string;
  rating: number; // de 1 à 5
  comment: string;
  date: string; // ISO string
}
