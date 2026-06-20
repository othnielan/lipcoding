import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PersonaStore } from '../../state/persona.store';
import { ScheduleStore } from '../../state/schedule.store';
import { Persona, PersonaId } from '../../domain/persona';
import { IconComponent } from '../../shared/icon.component';

/**
 * Home / onboarding screen. Lets the user pick a chatbot persona (tone + look)
 * before entering the console. Selecting a card previews it; "시작하기" commits
 * the choice, refreshes the greeting in that voice, and routes to the console.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="home">
      <header class="hero">
        <span class="kicker"><app-icon name="sparkles" [size]="14" /> 페르소나를 선택하세요</span>
        <h1>당신의 일정 파트너는<br />어떤 목소리였으면 하나요?</h1>
        <p>같은 일정도 누가 말해주느냐에 따라 하루가 달라집니다. 마음에 드는 캐릭터를 골라보세요.</p>
      </header>

      <div class="grid">
        @for (p of personas; track p.id) {
          <button
            class="card"
            [class.sel]="picked() === p.id"
            [style.--accent]="p.accent"
            [style.background]="p.gradient"
            (click)="pick(p.id)"
          >
            <span class="glow"></span>
            <span class="ic"><app-icon [name]="p.icon" [size]="30" /></span>
            <span class="role">{{ p.role }}</span>
            <span class="name">{{ p.name }}</span>
            <span class="tag">{{ p.tagline }}</span>
            <span class="desc">{{ p.description }}</span>
            @if (picked() === p.id) {
              <span class="check"><app-icon name="check" [size]="14" /></span>
            }
          </button>
        }
      </div>

      @if (current(); as p) {
        <div class="preview">
          <div class="bubble" [style.border-color]="p.accent">
            <span class="b-ic" [style.background]="p.gradient"><app-icon [name]="p.icon" [size]="16" /></span>
            <p>{{ p.greeting }}</p>
          </div>
          <button class="start" [style.background]="p.gradient" (click)="start()">
            {{ p.name }}와 시작하기 <app-icon name="back" [size]="15" class="flip" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        overflow-y: auto;
      }
      .home {
        max-width: 940px;
        margin: 0 auto;
        padding: 46px 22px 60px;
      }
      .hero {
        text-align: center;
        margin-bottom: 34px;
        animation: rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
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
      .kicker {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        font-weight: 700;
        color: #c4b5fd;
        background: rgba(139, 92, 246, 0.12);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 999px;
        padding: 5px 13px;
      }
      .hero h1 {
        margin: 16px 0 10px;
        font-size: 28px;
        line-height: 1.3;
        font-weight: 800;
        letter-spacing: -0.5px;
        color: #fff;
      }
      .hero p {
        margin: 0;
        font-size: 13.5px;
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }
      .card {
        position: relative;
        text-align: left;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        padding: 20px 18px;
        color: #fff;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 180px;
        transition:
          transform 0.18s ease,
          box-shadow 0.18s ease;
        animation: pop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: translateY(14px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .card::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(8, 10, 16, 0.42);
        z-index: 0;
      }
      .card > * {
        position: relative;
        z-index: 1;
      }
      .card:hover {
        transform: translateY(-3px);
      }
      .card.sel {
        box-shadow:
          0 0 0 2px var(--accent),
          0 16px 40px rgba(0, 0, 0, 0.4);
      }
      .glow {
        position: absolute;
        inset: 0;
        z-index: 0;
        opacity: 0;
        background: radial-gradient(300px 120px at 50% 0%, rgba(255, 255, 255, 0.4), transparent);
        transition: opacity 0.2s ease;
      }
      .card.sel .glow {
        opacity: 1;
      }
      .ic {
        width: 54px;
        height: 54px;
        border-radius: 15px;
        background: rgba(255, 255, 255, 0.16);
        display: grid;
        place-items: center;
        margin-bottom: 12px;
        backdrop-filter: blur(4px);
      }
      .role {
        font-size: 11.5px;
        font-weight: 700;
        opacity: 0.85;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .name {
        font-size: 22px;
        font-weight: 800;
        margin-top: 2px;
      }
      .tag {
        font-size: 12.5px;
        font-weight: 600;
        margin-top: 8px;
        opacity: 0.95;
      }
      .desc {
        font-size: 12px;
        line-height: 1.5;
        margin-top: 6px;
        opacity: 0.82;
      }
      .check {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #fff;
        color: #111;
        display: grid;
        place-items: center;
        z-index: 2;
      }
      .preview {
        margin-top: 26px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        animation: rise 0.4s ease both;
      }
      .bubble {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        max-width: 560px;
        background: var(--panel);
        border: 1.5px solid;
        border-radius: 16px;
        padding: 13px 15px;
      }
      .b-ic {
        flex: 0 0 auto;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #fff;
      }
      .bubble p {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.5;
        color: var(--ink);
      }
      .start {
        border: none;
        color: #fff;
        font-size: 14.5px;
        font-weight: 800;
        border-radius: 999px;
        padding: 13px 26px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
      }
      .flip {
        transform: scaleX(-1);
      }
      @media (max-width: 640px) {
        .grid {
          grid-template-columns: 1fr;
        }
        .hero h1 {
          font-size: 23px;
        }
      }
    `,
  ],
})
export class HomePage {
  private readonly router = inject(Router);
  private readonly personaStore = inject(PersonaStore);
  private readonly schedule = inject(ScheduleStore);

  readonly personas = this.personaStore.personas;
  readonly picked = signal<PersonaId>(this.personaStore.selectedId());

  current(): Persona | undefined {
    return this.personas.find((p) => p.id === this.picked());
  }

  pick(id: PersonaId): void {
    this.picked.set(id);
  }

  start(): void {
    const p = this.current();
    if (!p) return;
    this.personaStore.select(p.id);
    this.schedule.setGreeting(p.greeting);
    void this.router.navigateByUrl('/console');
  }
}
