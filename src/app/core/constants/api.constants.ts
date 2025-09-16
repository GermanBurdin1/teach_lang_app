import { environment } from '../../../../environment';
//automatique
export const API_ENDPOINTS = {
  AUTH: `${environment.apiUrl}/auth`,
  FILES: `${environment.apiUrl}/files`,
  LESSONS: `${environment.apiUrl}/lessons`,
  VOCABULARY: `${environment.apiUrl}/vocabulary`,
  STATISTICS: `${environment.apiUrl}/statistics`,
  MINDMAP: `${environment.apiUrl}/mindmap`,
  NOTIFICATIONS: `${environment.apiUrl}/notifications`,
  PAYMENTS: environment.paymentApiUrl,
  // Прямые URL для файлов (без API Gateway)
  FILES_DIRECT: 'http://localhost:3008'
};
