export interface User {
  id: string;
  email: string;
  roles: string[];        // ['student', 'teacher', 'admin']
  currentRole?: string;   // 'student' | 'teacher'
}
