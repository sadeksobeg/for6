import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: #1a1a1a;
    }
  `]
})
export class AppComponent {
  title = 'Professional Video Studio';
}