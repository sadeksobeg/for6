import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-studio-action-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './studio-action-button.component.html',
  styleUrl: './studio-action-button.component.scss',
  animations: [
    trigger('buttonState', [
      state('idle', style({
        transform: 'scale(1)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
      })),
      state('hover', style({
        transform: 'scale(1.05)',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4), 0 0 20px var(--accent-color)'
      })),
      state('active', style({
        transform: 'scale(1.02)',
        boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.5)'
      })),
      transition('* => *', animate('300ms ease-in-out'))
    ])
  ]
})
export class StudioActionButtonComponent implements OnInit {
  @Input() disabled: boolean = false;
  @Input() active: boolean = false;
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() accentColor: string = '#007bff';
  @Input() ariaLabel: string = '';
  @Output() buttonClick = new EventEmitter<void>();

  animationState: string = 'idle';

  ngOnInit() {
    this.updateAnimationState();
  }

  onMouseEnter() {
    if (!this.disabled && !this.active) {
      this.animationState = 'hover';
    }
  }

  onMouseLeave() {
    this.updateAnimationState();
  }

  onClick() {
    if (!this.disabled) {
      this.buttonClick.emit();
    }
  }

  private updateAnimationState() {
    if (this.active) {
      this.animationState = 'active';
    } else {
      this.animationState = 'idle';
    }
  }

  get computedAriaLabel(): string {
    return this.ariaLabel || this.label;
  }

  getIconSvg(): string {
    const iconMap: { [key: string]: string } = {
      'import': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        <path d="M12,11L8,15H10.5V19H13.5V15H16L12,11Z"/>
      </svg>`,
      'source-monitor': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
      </svg>`,
      'program-monitor': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18,4L20,8H17L15,4H9L7,8H4L6,4H18M2,10V12H22V10H2M2,14V16H22V14H2M2,18V20H22V18H2Z"/>
      </svg>`,
      'trim': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9,3V4H4V6H5V7.5C5,8.33 5.67,9 6.5,9C7.33,9 8,8.33 8,7.5V6H9V7H15V6H16V7.5C16,8.33 16.67,9 17.5,9C18.33,9 19,8.33 19,7.5V6H20V4H15V3H9M9.5,13L8,17H10L11.5,13H9.5M12.5,13L14,17H16L14.5,13H12.5Z"/>
      </svg>`,
      'ripple-edit': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7L15,11L11,15V13H7A5,5 0 0,0 2,18A5,5 0 0,0 7,23H9V21H7A3,3 0 0,1 4,18A3,3 0 0,1 7,15H11V13L15,17L11,21V19H7C5.29,19 3.9,17.71 3.9,16V12M16,8V10H20V8H16M16,12V14H20V12H16Z"/>
      </svg>`,
      'effects': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
      </svg>`,
      'inspector': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7,2V4H8V18A4,4 0 0,0 12,22A4,4 0 0,0 16,18V4H17V2H7M11,16C10.4,16 10,15.6 10,15C10,14.4 10.4,14 11,14C11.6,14 12,14.4 12,15C12,15.6 11.6,16 11,16M13,12C12.4,12 12,11.6 12,11C12,10.4 12.4,10 13,10C13.6,10 14,10.4 14,11C14,11.6 13.6,12 13,12M11,8C10.4,8 10,7.6 10,7C10,6.4 10.4,6 11,6C11.6,6 12,6.4 12,7C12,7.6 11.6,8 11,8Z"/>
      </svg>`,
      'audio-mixer': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
      </svg>`,
      'export': `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        <path d="M12,11L16,15H13.5V19H10.5V15H8L12,11Z"/>
      </svg>`
    };

    return iconMap[this.icon] || `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z"/>
    </svg>`;
  }
}
