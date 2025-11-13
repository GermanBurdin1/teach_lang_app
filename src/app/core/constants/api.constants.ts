import { environment } from '../../../../environment';
//automatique
export const API_ENDPOINTS = {
  AUTH: `${environment.apiUrl}/auth`,
  FILES: `${environment.apiUrl}/files`,
  LESSONS: `${environment.apiUrl}/lessons`,
  COURSES: `${environment.apiUrl}/courses`,
  VOCABULARY: `${environment.apiUrl}/vocabulary`,
  STATISTICS: `${environment.apiUrl}/statistics`,
  MINDMAP: `${environment.apiUrl}/mindmap`,
  NOTIFICATIONS: `${environment.apiUrl}/notifications`,
  PAYMENTS: environment.paymentApiUrl
};
