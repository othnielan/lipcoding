import { Routes } from '@angular/router';
import { SplashPage } from './features/onboarding/splash.page';
import { HomePage } from './features/onboarding/home.page';
import { LiveConsolePage } from './features/live-console/live-console.page';

export const routes: Routes = [
  { path: '', component: SplashPage },
  { path: 'home', component: HomePage },
  { path: 'console', component: LiveConsolePage },
  { path: '**', redirectTo: '' },
];
