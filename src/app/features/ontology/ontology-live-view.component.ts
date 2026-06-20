import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IntentPromptViewComponent } from './intent-prompt-view.component';
import { OntologyGraphCanvasComponent } from './ontology-graph-canvas.component';
import { TripleStoreTableComponent } from './triple-store-table.component';
import { SdkConsoleComponent } from './sdk-console.component';

@Component({
  selector: 'app-ontology-live-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IntentPromptViewComponent,
    OntologyGraphCanvasComponent,
    TripleStoreTableComponent,
    SdkConsoleComponent,
  ],
  template: `
    <div class="stack">
      <app-intent-prompt-view />
      <app-sdk-console />
      <app-ontology-graph-canvas />
      <app-triple-store-table />
    </div>
  `,
  styles: [
    `
      .stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
    `,
  ],
})
export class OntologyLiveViewComponent {}
