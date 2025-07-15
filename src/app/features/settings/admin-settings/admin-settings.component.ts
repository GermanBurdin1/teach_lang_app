import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminProfile } from '../../dashboard/school-dashboard/admin-profile.model';
import { AuthService } from '../../../services/auth.service';
import { ProfilesApiService } from '../../../services/profiles-api.service';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent implements OnInit {
  adminForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private profilesApi: ProfilesApiService
  ) {}

  ngOnInit(): void {
    this.adminForm = this.fb.group({
      platformName: ['', Validators.required],
      logoUrl: [''],
      defaultLanguage: ['fr'],
      timezone: ['Europe/Paris'],
      supportEmail: ['', [Validators.required, Validators.email]],

      payments: this.fb.group({
        currency: ['EUR'],
        commissionPercent: [30],
        payoutMethod: ['manual'],
        refundPolicy: ['']
      }),

      moderation: this.fb.group({
        enableReports: [true],
        autoRemoveThreshold: [3],
        notifyOnReports: [true]
      }),

      notifications: this.fb.group({
        emailEnabled: [true],
        pushEnabled: [false],
        templateWelcome: ['Bienvenue sur notre plateforme !']
      }),

      integrations: this.fb.group({
        stripeKey: [''],
        webhookUrl: ['']
      }),

      preferences: this.fb.group({
        theme: ['light']
      })
    });
  }

  onSubmit(): void {
    if (this.adminForm.valid) {
      const userId = this.auth.getCurrentUser()?.id;
      if (!userId) return;

      const profile: AdminProfile = {
        user_id: userId,
        ...this.adminForm.value
      };

      this.profilesApi.createProfile(profile).subscribe({
        next: () => console.log('[AdminSettings] Profil admin enregistré'),
        error: (err) => console.error('[AdminSettings] Erreur', err)
      });
    }
  }

  autoFillAndSubmit(): void {
  const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const platformNames = ['DelfEspace', 'LinguaHub', 'FLEExpress'];
  const supportEmails = ['admin@espace.fr', 'support@linguahub.com', 'contact@flexp.dev'];
  const refundPolicies = [
    'Remboursement possible sous 7 jours.',
    'Aucun remboursement après le début du cours.',
    'Contactez le support pour un remboursement.'
  ];
  const welcomeMessages = [
    'Bienvenue sur notre plateforme !',
    'Merci de nous avoir rejoints.',
    'Bon apprentissage avec nous !'
  ];

  this.adminForm.setValue({
    platformName: random(platformNames),
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    defaultLanguage: 'fr',
    timezone: 'Europe/Paris',
    supportEmail: random(supportEmails),

    payments: {
      currency: 'EUR',
      commissionPercent: 30,
      payoutMethod: 'manual',
      refundPolicy: random(refundPolicies)
    },

    moderation: {
      enableReports: true,
      autoRemoveThreshold: 3,
      notifyOnReports: true
    },

    notifications: {
      emailEnabled: true,
      pushEnabled: false,
      templateWelcome: random(welcomeMessages)
    },

    integrations: {
      stripeKey: '',
      webhookUrl: 'https://api.espace.fr/webhooks/events'
    },

    preferences: {
      theme: 'dark'
    }
  });

  this.onSubmit();
}

}
