import { Routes } from '@angular/router';
import { LiveConsolePage } from './features/live-console/live-console.page';

export const routes: Routes = [
  { path: '', component: LiveConsolePage },
  { path: '**', redirectTo: '' },
];
