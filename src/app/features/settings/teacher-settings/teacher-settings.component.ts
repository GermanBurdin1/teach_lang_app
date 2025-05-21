import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeacherProfile } from '../../dashboard/teacher-dashboard/teacher-profile.model';
import { ProfilesApiService } from '../../../services/profiles-api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-teacher-settings',
  templateUrl: './teacher-settings.component.html',
  styleUrls: ['./teacher-settings.component.css']
})
export class TeacherSettingsComponent implements OnInit {
  teacherForm!: FormGroup;
  photoMode: 'url' | 'file' = 'url';
  selectedPhotoFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private profilesApi: ProfilesApiService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.teacherForm = this.fb.group({
      name: ['', Validators.required],
      photoUrl: [''],
      bio: ['', Validators.required],
      experienceYears: [null, Validators.required],
      price: [null, Validators.required],
      specializations: [''],
      certificates: [''],
      email: ['', [Validators.required, Validators.email]],
      language: ['fr'],
      theme: ['dark']
    });
  }

  onSubmit(): void {
    if (this.teacherForm.valid) {
      const value = this.teacherForm.value;
      const userId = this.authService.getCurrentUser()?.id;

      if (!userId) {
        console.error('[TeacherSettings] Aucun user_id trouvé.');
        return;
      }

      const profile: TeacherProfile = {
        user_id: userId,
        full_name: value.name,
        photo_url: value.photoUrl,
        bio: value.bio,
        experienceYears: value.experienceYears,
        price: value.price,
        specializations: value.specializations.split(',').map((s: string) => s.trim()),
        certificates: value.certificates.split(',').map((c: string) => c.trim()),
        email: value.email,
        rating: 4.9,
        isActive: true,
        moderated: true,
        preferences: {
          language: value.language,
          theme: value.theme
        }
      };

      // Создать профиль
      this.profilesApi.createProfile(profile).subscribe({
        next: () => console.log('[TeacherSettings] Profil créé avec succès'),
        error: err => console.error('[TeacherSettings] Erreur de création', err)
      });
    }
  }


  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPhotoFile = input.files[0];
      this.teacherForm.get('photoUrl')?.setValue('');
    }
  }

  autoFillAndSubmit(): void {
    const randomNames = ['Jean Dupont', 'Marie Curie', 'Luc Moreau', 'Claire Martin'];
    const randomBios = [
      'Passionné par l\'enseignement du FLE depuis 10 ans.',
      'Spécialiste des examens DELF/DALF.',
      'J\'aime rendre l\'apprentissage ludique et efficace.',
      'Méthodes modernes, résultats garantis.'
    ];
    const randomCerts = ['DALF C1', 'Alliance Française', 'Phonétique Avancée', 'Master FLE'];
    const randomSpecs = ['DELF B2', 'Grammaire', 'Compréhension orale', 'Production écrite'];

    const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const randomInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    this.teacherForm.setValue({
      name: random(randomNames),
      photoUrl: 'https://randomuser.me/api/portraits/men/' + randomInt(10, 90) + '.jpg',
      bio: random(randomBios),
      experienceYears: randomInt(1, 15),
      price: randomInt(10, 50),
      specializations: `${random(randomSpecs)}, ${random(randomSpecs)}`,
      certificates: `${random(randomCerts)}, ${random(randomCerts)}`,
      email: `dev${randomInt(100, 999)}@test.dev`,
      language: 'fr',
      theme: 'dark'
    });

    this.onSubmit();
  }
}
