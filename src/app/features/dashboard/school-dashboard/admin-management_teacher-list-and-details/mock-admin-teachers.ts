import { AdminTeacher } from './admin-teacher.model';

export const MOCK_TEACHERS_ADMIN: AdminTeacher[] = [
  {
    id: '1',
    name: 'Anne Dupont',
    photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    specializations: ['DELF B2', 'Grammaire'],
    price: 25,
    rating: 4.8,
    isActive: true,
    registrationDate: '2023-09-12',
    moderated: true
  },
  {
    id: '2',
    name: 'Pierre Lafont',
    photoUrl: 'https://randomuser.me/api/portraits/men/46.jpg',
    specializations: ['DALF C1', 'Expression orale'],
    price: 30,
    rating: 4.6,
    isActive: false,
    registrationDate: '2024-01-22',
    moderated: false
  },
  {
    id: '3',
    name: 'Lucie Martin',
    photoUrl: 'https://randomuser.me/api/portraits/women/55.jpg',
    specializations: ['DELF B1', 'Compréhension écrite'],
    price: 20,
    rating: 4.9,
    isActive: true,
    registrationDate: '2023-06-15',
    moderated: true
  },
  {
    id: '4',
    name: 'Thomas Bellé',
    photoUrl: 'https://randomuser.me/api/portraits/men/33.jpg',
    specializations: ['Grammaire', 'Phonétique'],
    price: 22,
    rating: 4.7,
    isActive: true,
    registrationDate: '2022-12-05',
    moderated: false
  },
  {
    id: '5',
    name: 'Marie Chevalier',
    photoUrl: 'https://randomuser.me/api/portraits/women/28.jpg',
    specializations: ['DELF A2', 'Débutants'],
    price: 18,
    rating: 4.5,
    isActive: false,
    registrationDate: '2024-03-18',
    moderated: true
  },
  {
    id: '6',
    name: 'Jules Dumont',
    photoUrl: 'https://randomuser.me/api/portraits/men/52.jpg',
    specializations: ['DALF C2', 'Littérature'],
    price: 35,
    rating: 4.9,
    isActive: true,
    registrationDate: '2023-02-08',
    moderated: true
  },
  {
    id: '7',
    name: 'Sophie Renaud',
    photoUrl: 'https://randomuser.me/api/portraits/women/67.jpg',
    specializations: ['Conversation', 'Prononciation'],
    price: 24,
    rating: 4.6,
    isActive: true,
    registrationDate: '2023-11-30',
    moderated: false
  },
  {
    id: '8',
    name: 'Alex Leblanc',
    photoUrl: 'https://randomuser.me/api/portraits/men/71.jpg',
    specializations: ['Business French', 'TCF'],
    price: 28,
    rating: 4.8,
    isActive: false,
    registrationDate: '2024-01-05',
    moderated: true
  },
  {
    id: '9',
    name: 'Camille Noël',
    photoUrl: 'https://randomuser.me/api/portraits/women/39.jpg',
    specializations: ['Enfants', 'Jeux pédagogiques'],
    price: 20,
    rating: 4.4,
    isActive: true,
    registrationDate: '2023-08-22',
    moderated: false
  },
  {
    id: '10',
    name: 'Laurent Mallet',
    photoUrl: 'https://randomuser.me/api/portraits/men/25.jpg',
    specializations: ['DELF B2', 'Culture française'],
    price: 26,
    rating: 4.7,
    isActive: true,
    registrationDate: '2023-04-16',
    moderated: true
  },
  {
    id: '11',
    name: 'Nadine Girard',
    photoUrl: 'https://randomuser.me/api/portraits/women/83.jpg',
    specializations: ['DALF C1', 'Préparation examens'],
    price: 32,
    rating: 4.8,
    isActive: false,
    registrationDate: '2024-02-14',
    moderated: false
  },
  {
    id: '12',
    name: 'Benjamin Arnaud',
    photoUrl: 'https://randomuser.me/api/portraits/men/14.jpg',
    specializations: ['Immersion', 'Expression écrite'],
    price: 27,
    rating: 4.6,
    isActive: true,
    registrationDate: '2023-07-09',
    moderated: true
  }
];

// TODO : remplacer par des données dynamiques depuis l'API
