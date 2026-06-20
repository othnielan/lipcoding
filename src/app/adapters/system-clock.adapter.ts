import { Injectable } from '@angular/core';
import { Clock } from '../ports/clock.port';

@Injectable({ providedIn: 'root' })
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  nowISO(): string {
    return new Date().toISOString();
  }
  tz(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Asia/Seoul';
    }
  }
}
