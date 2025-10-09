export interface User {
  id: string;
  email: string;
  roles: string[];        // ['student', 'teacher', 'admin'] - с backend
  initials?: string;
  name: string;
  surname: string;
}
