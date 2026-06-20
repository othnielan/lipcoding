import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { PersonaStore } from '../../state/persona.store';
import { IconComponent } from '../../shared/icon.component';

/**
 * Animated splash screen. After a short intro it routes to the persona-select
 * home (first run) or straight to the console (returning users). A skip button
 * lets impatient users jump ahead.
 */
@Component({
  selector: 'app-splash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="splash">
      <div class="aura"></div>
      <div class="content">
        <div class="logo">
          <span class="ring r1"></span>
          <span class="ring r2"></span>
          <span class="mark"><app-icon name="sparkles" [size]="46" /></span>
        </div>
        <h1 class="title">스케줄게이미피케이션</h1>
        <p class="sub">발화 → 의도분류 → 온톨로지 → 퀘스트</p>
        <div class="loader"><span></span></div>
      </div>
      <button class="skip" (click)="go()">건너뛰기 ›</button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
      }
      .splash {
        position: relative;
        height: 100%;
        display: grid;
        place-items: center;
        background: radial-gradient(900px 700px at 50% 30%, #1d2335 0%, #0c0e15 60%);
        overflow: hidden;
      }
      .aura {
        position: absolute;
        width: 520px;
        height: 520px;
        border-radius: 50%;
        background: conic-gradient(from 0deg, #6366f1, #8b5cf6, #ec4899, #22d3ee, #6366f1);
        filter: blur(90px);
        opacity: 0.35;
        animation: spin 14s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .content {
        position: relative;
        text-align: center;
        animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(18px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .logo {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0 auto 22px;
        display: grid;
        place-items: center;
      }
      .mark {
        color: #fff;
        display: inline-flex;
        filter: drop-shadow(0 0 14px rgba(139, 92, 246, 0.8));
        animation: pulse 2.4s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.12);
        }
      }
      .ring {
        position: absolute;
        border-radius: 50%;
        border: 1.5px solid rgba(139, 92, 246, 0.5);
      }
      .ring.r1 {
        width: 92px;
        height: 92px;
        animation: ripple 2.6s ease-out infinite;
      }
      .ring.r2 {
        width: 92px;
        height: 92px;
        animation: ripple 2.6s ease-out infinite 1.3s;
      }
      @keyframes ripple {
        0% {
          opacity: 0.7;
          transform: scale(0.7);
        }
        100% {
          opacity: 0;
          transform: scale(1.6);
        }
      }
      .title {
        margin: 0;
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.5px;
        color: #fff;
      }
      .sub {
        margin: 8px 0 0;
        font-size: 13px;
        color: #9aa1b1;
      }
      .loader {
        width: 160px;
        height: 4px;
        margin: 30px auto 0;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        overflow: hidden;
      }
      .loader span {
        display: block;
        height: 100%;
        width: 40%;
        border-radius: 999px;
        background: linear-gradient(90deg, #8b5cf6, #22d3ee);
        animation: slide 1.6s ease-in-out infinite;
      }
      @keyframes slide {
        0% {
          transform: translateX(-120%);
        }
        100% {
          transform: translateX(320%);
        }
      }
      .skip {
        position: absolute;
        bottom: 26px;
        right: 26px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.06);
        color: #cdd2dd;
        font-size: 12.5px;
        font-weight: 600;
        border-radius: 999px;
        padding: 8px 16px;
        backdrop-filter: blur(6px);
      }
      @media (prefers-reduced-motion: reduce) {
        .aura,
        .mark,
        .ring,
        .loader span,
        .content {
          animation: none;
        }
      }
    `,
  ],
})
export class SplashPage {
  private readonly router = inject(Router);
  private readonly persona = inject(PersonaStore);
  private readonly destroyRef = inject(DestroyRef);
  private navigated = false;

  constructor() {
    // Timers only run in the browser; SSR renders the static splash markup.
    afterNextRender(() => {
      const timer = setTimeout(() => this.go(), 2600);
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }

  go(): void {
    if (this.navigated) return;
    this.navigated = true;
    void this.router.navigateByUrl(this.persona.onboarded() ? '/console' : '/home');
  }
}
