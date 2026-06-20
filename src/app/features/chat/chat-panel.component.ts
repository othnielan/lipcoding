import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { ScheduleStore } from '../../state/schedule.store';
import { ExtractService } from '../../services/extract.service';
import { PersonaStore } from '../../state/persona.store';
import { ChatBubbleComponent } from './chat-bubble.component';
import { ActiveQuestHeroComponent } from './active-quest-hero.component';
import { VoiceInputComponent } from './voice-input.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-chat-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ChatBubbleComponent,
    ActiveQuestHeroComponent,
    VoiceInputComponent,
    IconComponent,
  ],
  template: `
    <div class="scroll" #scroll>
      @for (m of store.messages(); track m.id) {
        <app-chat-bubble [msg]="m" />
      }
      @if (extract.busy()) {
        <div class="typing">
          <span class="avatar">
            <app-icon [name]="persona.selected().icon" [size]="16" />
          </span>
          <span class="bubble">
            <i class="dot"></i><i class="dot"></i><i class="dot"></i>
          </span>
        </div>
      }
    </div>
    <div class="dock">
      <app-active-quest-hero />
      <app-voice-input />
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #eef0f4;
      }
      .scroll {
        flex: 1;
        overflow-y: auto;
        padding: 10px 12px;
      }
      .typing {
        display: flex;
        align-items: flex-end;
        gap: 7px;
        margin: 4px 0 2px;
        animation: popIn 0.22s ease-out;
      }
      .typing .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #fff;
        border: 1px solid #e2e6ee;
        color: #2f6df6;
        display: grid;
        place-items: center;
        flex: none;
        animation: bob 1.1s ease-in-out infinite;
      }
      .typing .bubble {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #fff;
        border: 1px solid #e2e6ee;
        border-radius: 14px 14px 14px 4px;
        padding: 10px 12px;
      }
      .typing .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #9aa3b5;
        display: inline-block;
        animation: blink 1.2s infinite ease-in-out both;
      }
      .typing .dot:nth-child(2) {
        animation-delay: 0.18s;
      }
      .typing .dot:nth-child(3) {
        animation-delay: 0.36s;
      }
      @keyframes blink {
        0%,
        80%,
        100% {
          transform: translateY(0) scale(0.85);
          opacity: 0.4;
        }
        40% {
          transform: translateY(-4px) scale(1);
          opacity: 1;
        }
      }
      @keyframes bob {
        0%,
        100% {
          transform: translateY(0) rotate(0);
        }
        50% {
          transform: translateY(-3px) rotate(-4deg);
        }
      }
      @keyframes popIn {
        from {
          opacity: 0;
          transform: translateY(6px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .typing .avatar,
        .typing .dot,
        .typing {
          animation: none;
        }
      }
      .dock {
        border-top: 1px solid #dfe3ea;
        background: #f7f8fb;
        padding: 10px 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
    `,
  ],
})
export class ChatPanelComponent implements AfterViewChecked {
  readonly store = inject(ScheduleStore);
  readonly extract = inject(ExtractService);
  readonly persona = inject(PersonaStore);
  private readonly scroll = viewChild<ElementRef<HTMLDivElement>>('scroll');
  private lastCount = 0;
  private lastBusy = false;

  ngAfterViewChecked(): void {
    const count = this.store.messages().length;
    const busy = this.extract.busy();
    if (count !== this.lastCount || busy !== this.lastBusy) {
      this.lastCount = count;
      this.lastBusy = busy;
      const el = this.scroll()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }
}
