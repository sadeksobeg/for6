export interface VideoProject {
  id: string;
  name: string;
  description?: string;
  duration: number;
  fps: number;
  resolution: Resolution;
  tracks: Track[];
  createdAt: Date;
  modifiedAt: Date;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
  height: number;
  color: string;
  order: number;
}

export enum TrackType {
  VIDEO = 'video',
  AUDIO = 'audio',
  SUBTITLE = 'subtitle',
  OVERLAY = 'overlay'
}

export interface Clip {
  id: string;
  name: string;
  trackId: string;
  mediaAssetId: string;
  startTime: number;
  endTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  position: ClipPosition;
  effects: Effect[];
  transitions: Transition[];
  selected: boolean;
  locked: boolean;
  color?: string;
  volume?: number;
  opacity?: number;
}

export interface ClipPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Effect {
  id: string;
  name: string;
  type: EffectType;
  parameters: { [key: string]: any };
  enabled: boolean;
}

export enum EffectType {
  COLOR_CORRECTION = 'color_correction',
  BLUR = 'blur',
  SHARPEN = 'sharpen',
  BRIGHTNESS = 'brightness',
  CONTRAST = 'contrast',
  SATURATION = 'saturation',
  FADE_IN = 'fade_in',
  FADE_OUT = 'fade_out',
  CROP = 'crop',
  SCALE = 'scale'
}

export interface Transition {
  id: string;
  name: string;
  type: TransitionType;
  duration: number;
  parameters: { [key: string]: any };
}

export enum TransitionType {
  FADE = 'fade',
  DISSOLVE = 'dissolve',
  WIPE = 'wipe',
  SLIDE = 'slide',
  CUT = 'cut'
}

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  blob?: Blob;
  duration: number;
  resolution?: Resolution;
  fileSize: number;
  format: string;
  thumbnail?: string;
  waveform?: number[];
  metadata: MediaMetadata;
  createdAt: Date;
}

export enum MediaType {
  VIDEO = 'video',
  AUDIO = 'audio',
  IMAGE = 'image'
}

export interface MediaMetadata {
  codec?: string;
  bitrate?: number;
  frameRate?: number;
  channels?: number;
  sampleRate?: number;
  [key: string]: any;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
  loop: boolean;
}

export interface TimelineState {
  zoom: number;
  scrollPosition: number;
  snapToGrid: boolean;
  gridSize: number;
  selectedClips: string[];
  playheadPosition: number;
  viewportStart: number;
  viewportEnd: number;
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov';
  resolution: Resolution;
  fps: number;
  bitrate: number;
  quality: number;
  audioCodec: string;
  videoCodec: string;
}

export interface RenderProgress {
  progress: number;
  stage: string;
  timeRemaining?: number;
}