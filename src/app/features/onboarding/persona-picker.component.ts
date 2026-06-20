import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PersonaStore } from '../../state/persona.store';
import { ScheduleStore } from '../../state/schedule.store';
import { Persona, PersonaId } from '../../domain/persona';
import { IconComponent } from '../../shared/icon.component';

/**
 * Persona selection shown *inside the phone simulator screen*. Lets the user
 * pick a chatbot persona (tone + look). Committing the choice refreshes the
 * greeting in that voice and emits `done` so the phone reveals the chat.
 */
@Component({
  selector: 'app-persona-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="pick">
      <header class="hero">
        <span class="kicker"><app-icon name="sparkles" [size]="12" /> 페르소나 선택</span>
        <h1>어떤 목소리의<br />파트너가 좋으세요?</h1>
        <p>고른 캐릭터의 말투로 일정을 안내해 드려요.</p>
      </header>

      <div class="list">
        @for (p of personas; track p.id) {
          <button
            class="card"
            [class.sel]="picked() === p.id"
            [style.--accent]="p.accent"
            [style.background]="p.gradient"
            (click)="pick(p.id)"
          >
            <span class="ic"><app-icon [name]="p.icon" [size]="22" /></span>
            <span class="body">
              <span class="role">{{ p.role }}</span>
              <span class="name">{{ p.name }}</span>
              <span class="tag">{{ p.tagline }}</span>
            </span>
            @if (picked() === p.id) {
              <span class="check"><app-icon name="check" [size]="13" /></span>
            }
          </button>
        }
      </div>
    </div>

    @if (current(); as p) {
      <div class="dock">
        <div class="bubble" [style.border-color]="p.accent">
          <span class="b-ic" [style.background]="p.gradient"><app-icon [name]="p.icon" [size]="14" /></span>
          <p>{{ p.greeting }}</p>
        </div>
        <button class="start" [style.background]="p.gradient" (click)="start()">
          {{ p.name }}와 시작하기
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        z-index: 4;
        display: flex;
        flex-direction: column;
        background: #0c0e15;
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
      .pick {
        flex: 1;
        overflow-y: auto;
        padding: 18px 14px 8px;
      }
      .hero {
        text-align: center;
        margin-bottom: 16px;
      }
      .kicker {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 700;
        color: #c4b5fd;
        background: rgba(139, 92, 246, 0.12);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 999px;
        padding: 4px 11px;
      }
      .hero h1 {
        margin: 12px 0 7px;
        font-size: 19px;
        line-height: 1.32;
        font-weight: 800;
        letter-spacing: -0.4px;
        color: #fff;
      }
      .hero p {
        margin: 0;
        font-size: 12px;
        color: var(--muted);
      }
      .list {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .card {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        text-align: left;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        padding: 12px;
        color: #fff;
        overflow: hidden;
        animation: pop 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: translateY(10px);
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
        background: rgba(8, 10, 16, 0.4);
        z-index: 0;
      }
      .card > * {
        position: relative;
        z-index: 1;
      }
      .card.sel {
        box-shadow:
          0 0 0 2px var(--accent),
          0 10px 24px rgba(0, 0, 0, 0.4);
      }
      .ic {
        flex: 0 0 auto;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.16);
        display: grid;
        place-items: center;
        backdrop-filter: blur(4px);
      }
      .body {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .role {
        font-size: 10px;
        font-weight: 700;
        opacity: 0.85;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .name {
        font-size: 16px;
        font-weight: 800;
        margin-top: 1px;
      }
      .tag {
        font-size: 11px;
        margin-top: 3px;
        opacity: 0.9;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .check {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #fff;
        color: #111;
        display: grid;
        place-items: center;
        z-index: 2;
      }
      .dock {
        flex: 0 0 auto;
        padding: 10px 14px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(8, 10, 16, 0.5);
        backdrop-filter: blur(6px);
      }
      .bubble {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1.5px solid;
        border-radius: 13px;
        padding: 10px 11px;
        margin-bottom: 10px;
      }
      .b-ic {
        flex: 0 0 auto;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #fff;
      }
      .bubble p {
        margin: 0;
        font-size: 12px;
        line-height: 1.5;
        color: #e7e9ee;
      }
      .start {
        width: 100%;
        border: none;
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
      }
    `,
  ],
})
export class PersonaPickerComponent {
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
  }
}
