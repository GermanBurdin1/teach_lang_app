export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'booking_request' | 'booking_response' | 'booking_proposal' | 'booking_proposal_accepted' | 'booking_proposal_counter' | 'booking_proposal_refused' | 'lesson_cancelled_by_student';
  status: 'pending' | 'accepted' | 'rejected' | 'unread';
  hidden_by_user?: boolean;
  created_at?: string;
  data?: {
    accepted?: boolean;
    lessonId?: string;
    teacherId?: string;
    scheduledAt?: string;
    proposedTime?: string;
    studentId?: string;
    studentName?: string;
    refundAvailable?: boolean;
    reason?: string;
    [key: string]: any; // на случай других полей
  };
}
