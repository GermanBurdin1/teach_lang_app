export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: 'info' | 'booking_request' | 'booking_response';
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
}
