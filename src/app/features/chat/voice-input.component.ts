import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SPEECH } from '../../ports/speech.port';
import { ExtractService } from '../../services/extract.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-voice-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="composer">
      <input
        type="text"
        [(ngModel)]="draft"
        (keydown.enter)="send()"
        [placeholder]="placeholder()"
        [disabled]="extract.busy()"
      />
      <button class="send" [class.busy]="extract.busy()" (click)="send()" [disabled]="extract.busy() || !draft().trim()">
        @if (extract.busy()) {
          <app-icon name="loader" [size]="16" class="spin" />
        } @else {
          <app-icon name="send" [size]="16" />
        }
      </button>
      <button
        class="mic"
        [class.live]="listening()"
        [disabled]="!speech.supported"
        (click)="toggle()"
        [title]="speech.supported ? '눌러서 말하기 / 다시 누르면 종료' : '이 브라우저는 음성인식 미지원'"
      >
        <app-icon name="mic" [size]="18" />
      </button>
    </div>
    @if (listening()) {
      <div class="hint">듣고 있어요… 말한 뒤 멈추거나 마이크 버튼을 다시 누르면 전송됩니다</div>
    } @else if (speech.error()) {
      <div class="error"><app-icon name="alert" [size]="13" /> {{ speech.error() }}</div>
    }
  `,
  styles: [
    `
      .composer {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      input {
        flex: 1;
        border: 1px solid #d7dbe3;
        border-radius: 999px;
        padding: 9px 13px;
        font-size: 13px;
        outline: none;
        background: #fff;
        color: #1f2430;
      }
      input:focus {
        border-color: #2f6df6;
      }
      button {
        border: none;
        border-radius: 50%;
        width: 38px;
        height: 38px;
        font-size: 16px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
      }
      .send {
        background: #2f6df6;
        color: #fff;
      }
      .send:disabled {
        opacity: 0.4;
      }
      .send.busy:disabled {
        opacity: 1;
      }
      .spin {
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .mic {
        background: #efe6cf;
      }
      .mic:disabled {
        opacity: 0.4;
      }
      .mic.live {
        background: #ef4444;
        color: #fff;
        animation: ring 1s infinite;
      }
      .hint {
        font-size: 11px;
        color: #ef4444;
        text-align: center;
        margin-top: 6px;
      }
      .error {
        font-size: 11px;
        color: #b45309;
        background: #fef3c7;
        border-radius: 8px;
        padding: 6px 10px;
        margin-top: 6px;
        line-height: 1.4;
      }
      @keyframes ring {
        0% {
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
        }
        100% {
          box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
        }
      }
    `,
  ],
})
export class VoiceInputComponent {
  readonly speech = inject(SPEECH);
  readonly extract = inject(ExtractService);

  readonly draft = signal('');
  readonly listening = signal(false);

  placeholder = () =>
    this.speech.supported ? '일정을 말하거나 입력하세요…' : '일정을 입력하세요…';

  constructor() {
    // Mirror interim speech transcript into the input box.
    effect(() => {
      const t = this.speech.transcript();
      if (this.listening() && t) this.draft.set(t);
    });

    // When recognition ends after we started it, auto-send the result.
    effect(() => {
      const state = this.speech.state();
      if (this.listening() && (state === 'idle' || state === 'unsupported')) {
        this.listening.set(false);
        // Let the final transcript flush into the draft, then send.
        setTimeout(() => this.send(), 300);
      }
    });
  }

  toggle(): void {
    if (!this.speech.supported) return;
    if (this.listening()) {
      this.speech.stop();
      return;
    }
    this.listening.set(true);
    this.speech.start();
  }

  send(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.draft.set('');
    void this.extract.submit(text);
  }
}
