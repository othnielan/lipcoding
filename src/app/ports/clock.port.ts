import { InjectionToken } from '@angular/core';

export interface Clock {
  now(): Date;
  nowISO(): string;
  tz(): string;
}

export const CLOCK = new InjectionToken<Clock>('CLOCK');
