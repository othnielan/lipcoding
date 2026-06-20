import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { ScheduleStore } from '../../state/schedule.store';
import { ChatBubbleComponent } from './chat-bubble.component';
import { ActiveQuestHeroComponent } from './active-quest-hero.component';
import { VoiceInputComponent } from './voice-input.component';

@Component({
  selector: 'app-chat-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatBubbleComponent, ActiveQuestHeroComponent, VoiceInputComponent],
  template: `
    <div class="scroll" #scroll>
      @for (m of store.messages(); track m.id) {
        <app-chat-bubble [msg]="m" />
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
  private readonly scroll = viewChild<ElementRef<HTMLDivElement>>('scroll');
  private lastCount = 0;

  ngAfterViewChecked(): void {
    const count = this.store.messages().length;
    if (count !== this.lastCount) {
      this.lastCount = count;
      const el = this.scroll()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }
}
