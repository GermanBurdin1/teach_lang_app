export interface Review {
  id: string;
  studentName: string;
  rating: number; // от 1 до 5
  comment: string;
  date: string; // ISO string
}
