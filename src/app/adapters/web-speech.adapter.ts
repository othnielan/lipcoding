import { Injectable, signal } from '@angular/core';
import { SpeechRecognizerPort, SpeechState } from '../ports/speech.port';

/** Minimal typing for the Web Speech API (not in lib.dom by default). */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
}

@Injectable({ providedIn: 'root' })
export class WebSpeechRecognizer implements SpeechRecognizerPort {
  private readonly _transcript = signal('');
  private readonly _state = signal<SpeechState>('idle');
  private readonly _error = signal<string | null>(null);
  private recognition: SpeechRecognitionLike | null = null;

  readonly transcript = this._transcript.asReadonly();
  readonly state = this._state.asReadonly();
  readonly error = this._error.asReadonly();
  readonly supported: boolean;

  constructor() {
    const Ctor =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : undefined;
    this.supported = !!Ctor;
    if (!this.supported) {
      this._state.set('unsupported');
      return;
    }
    const rec: SpeechRecognitionLike = new Ctor();
    rec.lang = 'ko-KR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => {
      this._error.set(null);
      this._state.set('listening');
    };
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      this._transcript.set(text);
    };
    rec.onend = () => this._state.set('idle');
    rec.onerror = (e: any) => {
      this._error.set(messageForError(e?.error));
      this._state.set('idle');
    };
    this.recognition = rec;
  }

  start(): void {
    if (!this.recognition) return;
    this._transcript.set('');
    this._error.set(null);
    this._state.set('listening');
    try {
      this.recognition.start();
    } catch {
      // start() throws if already started — ignore.
    }
  }

  stop(): void {
    if (!this.recognition) return;
    this._state.set('processing');
    try {
      this.recognition.stop();
    } catch {
      /* ignore */
    }
  }
}

function messageForError(code: string | undefined): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '마이크 권한이 차단됐어요. 브라우저 주소창의 🎤 아이콘에서 허용해 주세요. (VS Code 내장 미리보기 대신 Chrome에서 열어야 합니다)';
    case 'no-speech':
      return '음성이 감지되지 않았어요. 다시 시도해 주세요.';
    case 'audio-capture':
      return '마이크를 찾을 수 없어요. 입력 장치를 확인해 주세요.';
    case 'network':
      return '음성 인식 네트워크 오류예요. 인터넷 연결을 확인해 주세요.';
    case 'aborted':
      return '';
    default:
      return code ? `음성 인식 오류: ${code}` : '음성 인식에 실패했어요.';
  }
}
