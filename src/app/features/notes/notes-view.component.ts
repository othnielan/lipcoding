import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SPEECH } from '../../ports/speech.port';
import { CLOCK } from '../../ports/clock.port';
import { NotesStore } from '../../state/notes.store';
import { NoteSource } from '../../domain/note';
import { IconComponent } from '../../shared/icon.component';

/**
 * Notes view embedded in the quest feature sheet. Lets the user jot memos by
 * typing or by voice, and lists everything captured (including non-schedule
 * utterances auto-saved from the chat).
 */
@Component({
  selector: 'app-notes-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="composer">
      <input
        type="text"
        [(ngModel)]="draft"
        (keydown.enter)="add('text')"
        [placeholder]="placeholder()"
      />
      <button class="send" (click)="add('text')" [disabled]="!draft().trim()" aria-label="노트 저장">
        <app-icon name="send" [size]="16" />
      </button>
      <button
        class="mic"
        [class.live]="listening()"
        [disabled]="!speech.supported"
        (click)="toggle()"
        [title]="speech.supported ? '눌러서 말하면 노트로 저장됩니다' : '이 브라우저는 음성인식 미지원'"
      >
        <app-icon name="mic" [size]="18" />
      </button>
    </div>
    @if (listening()) {
      <div class="hint">듣고 있어요… 멈추거나 마이크를 다시 누르면 노트로 저장됩니다</div>
    } @else if (speech.error()) {
      <div class="error"><app-icon name="alert" [size]="13" /> {{ speech.error() }}</div>
    }

    @if (notes.notes().length) {
      <ul class="list">
        @for (n of notes.notes(); track n.id) {
          <li class="note">
            <span class="ni"><app-icon name="note" [size]="15" /></span>
            <div class="nb">
              <p class="nt">{{ n.text }}</p>
              <div class="nm">
                <span class="src" [attr.data-src]="n.source">{{ srcLabel(n.source) }}</span>
                <span class="ago">{{ ago(n.createdAt) }}</span>
              </div>
            </div>
            <button class="del" (click)="notes.remove(n.id)" aria-label="노트 삭제">
              <app-icon name="trash" [size]="14" />
            </button>
          </li>
        }
      </ul>
    } @else {
      <div class="empty"><app-icon name="note" [size]="15" /> 아직 저장된 노트가 없어요. 말하거나 입력해보세요.</div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .composer { display: flex; gap: 6px; align-items: center; }
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
      input:focus { border-color: #2f6df6; }
      button {
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        cursor: pointer;
      }
      .send { background: #2f6df6; color: #fff; }
      .send:disabled { opacity: 0.4; }
      .mic { background: #efe6cf; color: #3a4252; }
      .mic:disabled { opacity: 0.4; }
      .mic.live { background: #ef4444; color: #fff; animation: ring 1s infinite; }
      .hint { font-size: 11px; color: #ef4444; text-align: center; margin-top: 6px; }
      .error {
        font-size: 11px;
        color: #b45309;
        background: #fef3c7;
        border-radius: 8px;
        padding: 6px 10px;
        margin-top: 6px;
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
      .note {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        background: #fff;
        border: 1px solid #e6e9ef;
        border-left: 3px solid #f5b301;
        border-radius: 9px;
        padding: 9px 10px;
      }
      .ni { flex: 0 0 auto; color: #b6841a; display: inline-flex; padding-top: 1px; }
      .nb { flex: 1; min-width: 0; }
      .nt { margin: 0; font-size: 13px; color: #2a3140; line-height: 1.45; word-break: break-word; }
      .nm { display: flex; align-items: center; gap: 7px; margin-top: 4px; }
      .src {
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.02em;
        border-radius: 999px;
        padding: 1px 7px;
        background: #eef1f6;
        color: #525a6b;
      }
      .src[data-src='voice'] { background: #fde7e7; color: #c0392b; }
      .src[data-src='auto'] { background: #e6f0ff; color: #2f6df6; }
      .ago { font-size: 11px; color: #8a92a3; }
      .del {
        flex: 0 0 auto;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: #f6f7fa;
        color: #97a0b0;
      }
      .empty { display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; color: #7a8294; font-size: 13px; padding: 26px 0; }
      @keyframes ring {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
        100% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
      }
    `,
  ],
})
export class NotesViewComponent {
  readonly notes = inject(NotesStore);
  readonly speech = inject(SPEECH);
  private readonly clock = inject(CLOCK);

  readonly draft = signal('');
  readonly listening = signal(false);

  placeholder = () =>
    this.speech.supported ? '노트를 말하거나 입력하세요…' : '노트를 입력하세요…';

  constructor() {
    // Mirror interim speech transcript into the input box.
    effect(() => {
      const t = this.speech.transcript();
      if (this.listening() && t) this.draft.set(t);
    });

    // When recognition ends after we started it, auto-save the spoken note.
    effect(() => {
      const state = this.speech.state();
      if (this.listening() && (state === 'idle' || state === 'unsupported')) {
        this.listening.set(false);
        setTimeout(() => this.add('voice'), 300);
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

  add(source: NoteSource): void {
    const text = this.draft().trim();
    if (!text) return;
    this.draft.set('');
    this.notes.add(text, source);
  }

  srcLabel(s: NoteSource): string {
    switch (s) {
      case 'voice':
        return '음성';
      case 'auto':
        return '자동';
      default:
        return '입력';
    }
  }

  ago(iso: string): string {
    const diff = this.clock.now().getTime() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '방금';
    if (min < 60) return `${min}분 전`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    return `${d}일 전`;
  }
}
