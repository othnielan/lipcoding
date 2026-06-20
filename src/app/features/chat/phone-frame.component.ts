import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ChatPanelComponent } from './chat-panel.component';
import { CLOCK } from '../../ports/clock.port';

@Component({
  selector: 'app-phone-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatPanelComponent],
  template: `
    <div class="phone">
      <div class="statusbar">
        <span>{{ clockText() }}</span>
        <span class="island"></span>
        <span class="right">5G &nbsp;<span class="batt">▮▮▮</span></span>
      </div>
      <div class="appbar">
        <span class="back">‹</span>
        <span class="name">🧙 QuestMaster</span>
        <span class="more">⋯</span>
      </div>
      <div class="screen">
        <app-chat-panel />
      </div>
      <div class="homebar"></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: grid;
        place-items: center;
      }
      .phone {
        width: 372px;
        height: 760px;
        background: #000;
        border-radius: 46px;
        padding: 12px;
        box-shadow:
          0 30px 60px rgba(0, 0, 0, 0.5),
          inset 0 0 0 2px #2b2b2b;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .statusbar {
        height: 30px;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px;
        font-size: 12px;
        font-weight: 600;
        position: relative;
      }
      .island {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: 4px;
        width: 96px;
        height: 22px;
        background: #000;
        border-radius: 14px;
      }
      .batt {
        letter-spacing: -2px;
      }
      .appbar {
        background: #f7f8fb;
        border-radius: 18px 18px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 14px;
        font-weight: 700;
        color: #1f2430;
        border-bottom: 1px solid #e6e9ef;
      }
      .appbar .back,
      .appbar .more {
        color: #2f6df6;
        font-size: 18px;
      }
      .name {
        font-size: 14px;
      }
      .screen {
        flex: 1;
        overflow: hidden;
        background: #eef0f4;
      }
      .homebar {
        height: 22px;
        border-radius: 0 0 18px 18px;
        background: #f7f8fb;
        position: relative;
      }
      .homebar::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 7px;
        transform: translateX(-50%);
        width: 120px;
        height: 5px;
        border-radius: 3px;
        background: #20242c;
      }
    `,
  ],
})
export class PhoneFrameComponent {
  private readonly clock = inject(CLOCK);
  readonly clockText = signal(this.fmt());

  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.clockText.set(this.fmt()), 10000);
    }
  }

  private fmt(): string {
    const d = this.clock.now();
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
}
