import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeacherProfileService } from '../../dashboard/teacher-dashboard/teacher-profile.service';
import { TeacherProfile } from '../../dashboard/teacher-dashboard/teacher-profile.model';

@Component({
  selector: 'app-teacher-settings',
  templateUrl: './teacher-settings.component.html',
  styleUrls: ['./teacher-settings.component.css']
})
export class TeacherSettingsComponent implements OnInit {
  teacherForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private teacherService: TeacherProfileService
  ) { }

  ngOnInit(): void {
    const saved = localStorage.getItem('teacher_profile');
    const initialData = saved ? JSON.parse(saved) : {};

    this.teacherForm = this.fb.group({
      name: ['', Validators.required],
      photoUrl: [''],
      bio: ['', Validators.required],
      experienceYears: [null, Validators.required],
      price: [null, Validators.required],
      specializations: [''],
      certificates: [''],
      email: ['', [Validators.required, Validators.email]],

      // Только эти два поля оставляем
      language: ['fr'],
      theme: ['dark']
    });

  }

  onSubmit(): void {
    if (this.teacherForm.valid) {
      const value = this.teacherForm.value;

      const profile: TeacherProfile = {
        id: 'me',
        name: value.name,
        photoUrl: value.photoUrl,
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
          theme: value.theme,
        }
      };

      this.teacherService.setProfile(profile);
    }
  }
  photoMode: 'url' | 'file' = 'url'; // начальный режим
  selectedPhotoFile: File | null = null;

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPhotoFile = input.files[0];
      this.teacherForm.get('photoUrl')?.setValue(''); // сбрасываем URL если выбрали файл
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
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    this.teacherForm.setValue({
      name: random(randomNames),
      photoUrl: 'https://randomuser.me/api/portraits/men/' + randomInt(10, 90) + '.jpg',
      bio: random(randomBios),
      experienceYears: randomInt(1, 15),
      price: randomInt(10, 50),
      specializations: `${random(randomSpecs)}, ${random(randomSpecs)}`,
      certificates: `${random(randomCerts)}, ${random(randomCerts)}`,
      email: `dev${randomInt(100, 999)}@test.dev`
    });

    // После заполнения — вызвать сохранение
    this.onSubmit();
  }


}
