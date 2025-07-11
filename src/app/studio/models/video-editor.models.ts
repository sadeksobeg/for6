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
}

export enum TrackType {
  VIDEO = 'video',
  AUDIO = 'audio',
  SUBTITLE = 'subtitle',
  EFFECT = 'effect'
}

export interface Clip {
  id: string;
  name: string;
  trackId: string;
  mediaId: string;
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
}

export interface ClipPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
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
  FADE_OUT = 'fade_out'
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
  SLIDE = 'slide'
}

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number;
  resolution?: Resolution;
  fileSize: number;
  format: string;
  thumbnail?: string;
  waveform?: number[];
  metadata: MediaMetadata;
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
}

export interface ExportSettings {
  format: string;
  resolution: Resolution;
  fps: number;
  bitrate: number;
  quality: number;
  audioCodec: string;
  videoCodec: string;
}