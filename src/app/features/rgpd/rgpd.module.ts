import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { RgpdConsentBannerComponent } from './rgpd-consent-banner/rgpd-consent-banner.component';
import { DataRightsComponent } from './data-rights/data-rights.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { CookiesPolicyComponent } from './cookies-policy/cookies-policy.component';
import { TermsComponent } from './terms/terms.component';
import { BackToHomeButtonComponent } from '../../shared/components/back-to-home-button/back-to-home-button.component';

const routes: Routes = [
  { path: '', component: DataRightsComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: 'cookies-policy', component: CookiesPolicyComponent },
  { path: 'terms', component: TermsComponent }
];

@NgModule({
  declarations: [
    RgpdConsentBannerComponent,
    DataRightsComponent,
    PrivacyPolicyComponent,
    CookiesPolicyComponent,
    TermsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    BackToHomeButtonComponent
  ],
  exports: [
    RgpdConsentBannerComponent,
    DataRightsComponent,
    PrivacyPolicyComponent,
    CookiesPolicyComponent,
    TermsComponent
  ]
})
export class RgpdModule { }
