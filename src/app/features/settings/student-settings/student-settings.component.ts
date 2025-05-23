import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StudentProfile } from '../../dashboard/student-dashboard/student-profile.model';
import { ProfilesApiService } from '../../../services/profiles-api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-student-settings',
  templateUrl: './student-settings.component.html',
  styleUrls: ['./student-settings.component.css']
})
export class StudentSettingsComponent implements OnInit {
  studentForm!: FormGroup;
  photoMode: 'url' | 'file' = 'url';
  selectedPhotoFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private profilesApi: ProfilesApiService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.studentForm = this.fb.group({
      name: ['', Validators.required],
      photoUrl: [''],
      bio: ['', Validators.required],
      experienceYears: [null, Validators.required],
      price: [null, Validators.required],
      specializations: [''],
      certificates: [''],
      email: ['', [Validators.required, Validators.email]],
      language: ['fr'],
      theme: ['dark'],
    });
  }

  onSubmit(): void {
    if (this.studentForm.valid) {
      const value = this.studentForm.value;
      const userId = this.authService.getCurrentUser()?.id;

      if (!userId) {
        console.error('[StudentSettings] Aucun user_id trouvé.');
        return;
      }

      const profile: StudentProfile = {
        user_id: userId,
        full_name: value.name,
        photo_url: value.photoUrl,
        bio: value.bio,
        email: value.email,
        isActive: true,
        moderated: true,
        preferences: {
          language: value.language,
          theme: value.theme
        },
        availability: value.availability.map((a: any) => ({ day: a.day, from: a.from, to: a.to }))
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
      this.studentForm.get('photoUrl')?.setValue('');
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

    const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const randomInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    this.studentForm.setValue({
      name: random(randomNames),
      photoUrl: 'https://randomuser.me/api/portraits/men/' + randomInt(10, 90) + '.jpg',
      bio: random(randomBios),
      email: `dev${randomInt(100, 999)}@test.dev`,
      language: 'fr',
      theme: 'dark'
    });

    this.onSubmit();
  }

  get availabilityArray(): FormGroup[] {
  return (this.studentForm.get('availability') as FormArray).controls as FormGroup[];
}

}
