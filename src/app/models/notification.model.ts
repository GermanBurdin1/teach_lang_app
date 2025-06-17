export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'booking_request' | 'booking_response';
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  data?: {
    accepted?: boolean;
    lessonId?: string;
    teacherId?: string;
    scheduledAt?: string;
    [key: string]: any; // на случай других полей
  };
}
