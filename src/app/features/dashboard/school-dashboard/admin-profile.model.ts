export interface AdminProfile {
  user_id: string;
  platformName: string;
  logoUrl?: string;
  defaultLanguage: 'fr' | 'en' | 'ru';
  timezone: string;
  supportEmail: string;

  payments: {
    currency: string;
    commissionPercent: number;
    payoutMethod: 'manual' | 'automatic';
    refundPolicy: string;
  };

  moderation: {
    enableReports: boolean;
    autoRemoveThreshold: number;
    notifyOnReports: boolean;
  };

  notifications: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    templateWelcome: string;
  };

  integrations: {
    stripeKey?: string;
    webhookUrl?: string;
  };

  preferences: {
    theme: 'light' | 'dark';
  };
}
