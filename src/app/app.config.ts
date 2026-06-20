import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { CLOCK } from './ports/clock.port';
import { SPEECH } from './ports/speech.port';
import { LLM_EXTRACTOR } from './ports/llm-extractor.port';
import { SystemClock } from './adapters/system-clock.adapter';
import { WebSpeechRecognizer } from './adapters/web-speech.adapter';
import { CopilotExtractor } from './adapters/copilot-extractor.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),

    // SOLID: depend on abstractions (tokens); bind concrete adapters here only.
    { provide: CLOCK, useExisting: SystemClock },
    { provide: SPEECH, useExisting: WebSpeechRecognizer },
    { provide: LLM_EXTRACTOR, useExisting: CopilotExtractor },
  ],
};
