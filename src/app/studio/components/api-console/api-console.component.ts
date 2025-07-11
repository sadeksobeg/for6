import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { VideoEditingApiService, ApiResponse, Timeline, ExportSettings } from '../../services/video-editing-api.service';

interface Command {
  name: string;
  description: string;
  syntax: string;
  example: string;
}

@Component({
  selector: 'app-api-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="api-console">
      <div class="console-header">
        <h3>Video Editing API Console</h3>
        <div class="console-controls">
          <button class="btn btn-sm" (click)="clearConsole()">Clear</button>
          <button class="btn btn-sm" (click)="showHelp()">Help</button>
        </div>
      </div>
      
      <div class="console-output" #consoleOutput>
        <div *ngFor="let entry of consoleEntries; trackBy: trackByIndex" 
             [class]="'console-entry ' + entry.type">
          <span class="timestamp">{{ entry.timestamp }}</span>
          <span class="content">{{ entry.content }}</span>
        </div>
      </div>
      
      <div class="console-input">
        <span class="prompt">></span>
        <input 
          type="text" 
          [(ngModel)]="currentCommand"
          (keydown.enter)="executeCommand()"
          (keydown.arrowup)="navigateHistory(-1)"
          (keydown.arrowdown)="navigateHistory(1)"
          placeholder="Enter command (type 'help' for available commands)"
          #commandInput
        />
        <button class="execute-btn" (click)="executeCommand()">Execute</button>
      </div>
      
      <!-- Help Modal -->
      <div class="help-modal" *ngIf="showHelpModal" (click)="showHelpModal = false">
        <div class="help-content" (click)="$event.stopPropagation()">
          <div class="help-header">
            <h3>Available Commands</h3>
            <button class="close-btn" (click)="showHelpModal = false">×</button>
          </div>
          <div class="help-body">
            <div *ngFor="let command of availableCommands" class="command-help">
              <h4>{{ command.name }}</h4>
              <p>{{ command.description }}</p>
              <div class="syntax">Syntax: <code>{{ command.syntax }}</code></div>
              <div class="example">Example: <code>{{ command.example }}</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./api-console.component.scss']
})
export class ApiConsoleComponent implements OnInit, OnDestroy {
  @ViewChild('consoleOutput') consoleOutput!: ElementRef<HTMLDivElement>;
  @ViewChild('commandInput') commandInput!: ElementRef<HTMLInputElement>;

  currentCommand = '';
  consoleEntries: { type: string; content: string; timestamp: string }[] = [];
  commandHistory: string[] = [];
  historyIndex = -1;
  showHelpModal = false;

  availableCommands: Command[] = [
    {
      name: 'IMPORT',
      description: 'Import and inspect a video file',
      syntax: 'IMPORT --file <path>',
      example: 'IMPORT --file test.mp4'
    },
    {
      name: 'CREATE_PROJECT',
      description: 'Create a new project',
      syntax: 'CREATE_PROJECT [--name <name>]',
      example: 'CREATE_PROJECT --name "My Video"'
    },
    {
      name: 'ADD_VIDEO_TRACK',
      description: 'Add a video track to timeline',
      syntax: 'ADD_VIDEO_TRACK [--name <name>]',
      example: 'ADD_VIDEO_TRACK --name "Main Video"'
    },
    {
      name: 'ADD_AUDIO_TRACK',
      description: 'Add an audio track to timeline',
      syntax: 'ADD_AUDIO_TRACK [--name <name>]',
      example: 'ADD_AUDIO_TRACK --name "Background Music"'
    },
    {
      name: 'ADD_CLIP',
      description: 'Add a clip to a track',
      syntax: 'ADD_CLIP --file <path> --track <trackId> [--position <seconds>]',
      example: 'ADD_CLIP --file video.mp4 --track video1'
    },
    {
      name: 'PLAY',
      description: 'Start playback',
      syntax: 'PLAY [<position>]',
      example: 'PLAY 5.5'
    },
    {
      name: 'PAUSE',
      description: 'Pause playback',
      syntax: 'PAUSE',
      example: 'PAUSE'
    },
    {
      name: 'SCRUB',
      description: 'Jump to specific time',
      syntax: 'SCRUB <position>',
      example: 'SCRUB 10.0'
    },
    {
      name: 'SPLIT_CLIP',
      description: 'Split a clip at specific time',
      syntax: 'SPLIT_CLIP --clip <clipId> --at <time>',
      example: 'SPLIT_CLIP --clip c1 --at 4.0'
    },
    {
      name: 'DELETE_RANGE',
      description: 'Delete a time range from track',
      syntax: 'DELETE_RANGE --track <trackId> --start <time> --end <time>',
      example: 'DELETE_RANGE --track video1 --start 2.0 --end 3.5'
    },
    {
      name: 'EXPORT',
      description: 'Export timeline to video',
      syntax: 'EXPORT --preset <preset> [--format <format>]',
      example: 'EXPORT --preset web --format mp4'
    },
    {
      name: 'GET_TIMELINE',
      description: 'Get current timeline JSON',
      syntax: 'GET_TIMELINE',
      example: 'GET_TIMELINE'
    }
  ];

  private destroy$ = new Subject<void>();
  private fileInput: HTMLInputElement;

  constructor(private apiService: VideoEditingApiService) {
    // Create hidden file input for file selection
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'video/*,audio/*';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);
  }

  ngOnInit(): void {
    this.addEntry('system', 'Video Editing API Console initialized. Type "help" for available commands.');
    
    // Listen to API logs
    this.apiService.timeline
      .pipe(takeUntil(this.destroy$))
      .subscribe(timeline => {
        if (timeline) {
          this.addEntry('info', `Timeline updated: ${timeline.tracks.length} tracks, ${timeline.duration.toFixed(2)}s duration`);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.removeChild(this.fileInput);
  }

  async executeCommand(): Promise<void> {
    if (!this.currentCommand.trim()) return;

    const command = this.currentCommand.trim();
    this.addEntry('command', `> ${command}`);
    this.commandHistory.unshift(command);
    this.historyIndex = -1;

    try {
      const result = await this.parseAndExecuteCommand(command);
      this.addEntry('response', JSON.stringify(result, null, 2));
    } catch (error) {
      this.addEntry('error', `Error: ${error}`);
    }

    this.currentCommand = '';
    this.scrollToBottom();
  }

  private async parseAndExecuteCommand(command: string): Promise<ApiResponse> {
    const parts = command.split(' ');
    const cmd = parts[0].toUpperCase();
    const args = this.parseArguments(parts.slice(1));

    switch (cmd) {
      case 'HELP':
        this.showHelp();
        return { success: true, data: 'Help displayed', timestamp: new Date().toISOString() };

      case 'IMPORT':
        if (!args.file) throw new Error('--file parameter required');
        return await this.handleImport(args.file);

      case 'CREATE_PROJECT':
        return this.apiService.createProject(args.name || 'Untitled Project');

      case 'ADD_VIDEO_TRACK':
        return this.apiService.addVideoTrack(args.name);

      case 'ADD_AUDIO_TRACK':
        return this.apiService.addAudioTrack(args.name);

      case 'ADD_CLIP':
        if (!args.file || !args.track) throw new Error('--file and --track parameters required');
        return await this.handleAddClip(args.file, args.track, args.position);

      case 'PLAY':
        const playPosition = parts[1] ? parseFloat(parts[1]) : undefined;
        return this.apiService.play(playPosition);

      case 'PAUSE':
        return this.apiService.pause();

      case 'SCRUB':
        if (!parts[1]) throw new Error('Position parameter required');
        return this.apiService.scrub(parseFloat(parts[1]));

      case 'SPLIT_CLIP':
        if (!args.clip || !args.at) throw new Error('--clip and --at parameters required');
        return this.apiService.splitClip(args.clip, parseFloat(args.at));

      case 'DELETE_RANGE':
        if (!args.track || !args.start || !args.end) {
          throw new Error('--track, --start, and --end parameters required');
        }
        return this.apiService.deleteRange(args.track, parseFloat(args.start), parseFloat(args.end));

      case 'EXPORT':
        if (!args.preset) throw new Error('--preset parameter required');
        const exportSettings: ExportSettings = {
          preset: args.preset as any,
          format: (['mp4', 'mov', 'avi', 'webm'].includes(args.format) ? args.format : 'mp4') as 'mp4' | 'mov' | 'avi' | 'webm'
        };
        return await this.apiService.exportTimeline(exportSettings);

      case 'GET_TIMELINE':
        const timeline = await this.apiService.timeline.pipe(takeUntil(this.destroy$)).toPromise();
        return { success: true, data: timeline, timestamp: new Date().toISOString() };

      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  }

  private parseArguments(args: string[]): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const key = args[i].substring(2);
        const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '';
        result[key] = value;
        if (value) i++; // Skip next argument as it's the value
      }
    }
    
    return result;
  }

  private async handleImport(filename: string): Promise<ApiResponse> {
    if (filename === 'browse') {
      return new Promise((resolve) => {
        this.fileInput.onchange = async (event: any) => {
          const file = event.target.files[0];
          if (file) {
            const result = await this.apiService.importVideo(file);
            resolve(result);
          }
        };
        this.fileInput.click();
      });
    } else {
      return await this.apiService.importVideo(filename);
    }
  }

  private async handleAddClip(filename: string, trackId: string, position?: string): Promise<ApiResponse> {
    if (filename === 'browse') {
      return new Promise((resolve) => {
        this.fileInput.onchange = async (event: any) => {
          const file = event.target.files[0];
          if (file) {
            const pos = position ? parseFloat(position) : undefined;
            const result = await this.apiService.addClip(file, trackId, pos);
            resolve(result);
          }
        };
        this.fileInput.click();
      });
    } else {
      const pos = position ? parseFloat(position) : undefined;
      return await this.apiService.addClip(filename, trackId, pos);
    }
  }

  showHelp(): void {
    this.showHelpModal = true;
  }

  clearConsole(): void {
    this.consoleEntries = [];
    this.addEntry('system', 'Console cleared.');
  }

  navigateHistory(direction: number): void {
    if (this.commandHistory.length === 0) return;

    this.historyIndex += direction;
    this.historyIndex = Math.max(-1, Math.min(this.historyIndex, this.commandHistory.length - 1));

    if (this.historyIndex >= 0) {
      this.currentCommand = this.commandHistory[this.historyIndex];
    } else {
      this.currentCommand = '';
    }
  }

  private addEntry(type: string, content: string): void {
    this.consoleEntries.push({
      type,
      content,
      timestamp: new Date().toLocaleTimeString()
    });
    
    setTimeout(() => this.scrollToBottom(), 0);
  }

  private scrollToBottom(): void {
    if (this.consoleOutput) {
      this.consoleOutput.nativeElement.scrollTop = this.consoleOutput.nativeElement.scrollHeight;
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}