import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  output,
} from '@angular/core';
import { IconComponent } from '../../shared/icon.component';

/**
 * Splash shown *inside the phone simulator screen* (not full-page). After a
 * short intro it emits `done`; a skip button advances immediately.
 */
@Component({
  selector: 'app-phone-splash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="splash">
      <div class="aura"></div>
      <div class="content">
        <div class="logo">
          <span class="ring r1"></span>
          <span class="ring r2"></span>
          <span class="mark"><app-icon name="sparkles" [size]="40" /></span>
        </div>
        <h1 class="title">스케줄게이미피케이션</h1>
        <p class="sub">발화 → 의도분류 → 온톨로지 → 퀘스트</p>
        <div class="loader"><span></span></div>
      </div>
      <button class="skip" (click)="done.emit()">건너뛰기 ›</button>
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        z-index: 4;
      }
      .splash {
        position: relative;
        height: 100%;
        display: grid;
        place-items: center;
        background: #0c0e15;
        overflow: hidden;
        animation: fade 0.3s ease both;
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      .aura {
        position: absolute;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: #6366f1;
        filter: blur(60px);
        opacity: 0.22;
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
        animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .logo {
        position: relative;
        width: 100px;
        height: 100px;
        margin: 0 auto 18px;
        display: grid;
        place-items: center;
      }
      .mark {
        color: #fff;
        display: inline-flex;
        filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.8));
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
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 1.5px solid rgba(139, 92, 246, 0.5);
      }
      .ring.r1 {
        animation: ripple 2.6s ease-out infinite;
      }
      .ring.r2 {
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
        font-size: 19px;
        font-weight: 800;
        letter-spacing: -0.4px;
        color: #fff;
      }
      .sub {
        margin: 7px 0 0;
        font-size: 11.5px;
        color: #9aa1b1;
      }
      .loader {
        width: 130px;
        height: 4px;
        margin: 24px auto 0;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        overflow: hidden;
      }
      .loader span {
        display: block;
        height: 100%;
        width: 40%;
        border-radius: 999px;
        background: #8b5cf6;
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
        bottom: 18px;
        right: 18px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.06);
        color: #cdd2dd;
        font-size: 12px;
        font-weight: 600;
        border-radius: 999px;
        padding: 7px 14px;
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
export class PhoneSplashComponent {
  readonly done = output<void>();
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Timers only run in the browser; SSR renders the static splash markup.
    afterNextRender(() => {
      const timer = setTimeout(() => this.done.emit(), 2400);
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }
}
