// Shotcut-inspired data models for professional video editing
export interface VideoTrack {
  id: string;
  name: string;
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  clips: VideoClip[];
  height: number;
}

export interface AudioTrack {
  id: string;
  name: string;
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  clips: AudioClip[];
  height: number;
}

export interface VideoClip {
  id: string;
  name: string;
  resource: string;
  in: number;
  out: number;
  start: number;
  duration: number;
  trackIndex: number;
  selected: boolean;
  color?: string;
  thumbnail?: string;
  filters: Filter[];
  properties: ClipProperties;
}

export interface AudioClip {
  id: string;
  name: string;
  resource: string;
  in: number;
  out: number;
  start: number;
  duration: number;
  trackIndex: number;
  selected: boolean;
  volume: number;
  waveform?: number[];
  filters: Filter[];
}

export interface Filter {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  parameters: { [key: string]: any };
}

export interface ClipProperties {
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  opacity: number;
  blend_mode: string;
}

export interface Timeline {
  fps: number;
  width: number;
  height: number;
  duration: number;
  position: number;
  scale: number;
  videoTracks: VideoTrack[];
  audioTracks: AudioTrack[];
  modified_at?: string;
}

export interface Project {
  name: string;
  timeline: Timeline;
  resources: Resource[];
  filters: Filter[];
}

export interface Resource {
  id: string;
  name: string;
  path: string;
  type: 'video' | 'audio' | 'image';
  duration: number;
  fps?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  waveform?: number[];
}

export interface PlaybackState {
  playing: boolean;
  position: number;
  speed: number;
  loop: boolean;
  volume: number;
  muted: boolean;
}

export interface ViewportState {
  zoom: number;
  offset: { x: number; y: number };
  grid: boolean;
  safe_areas: boolean;
  rulers: boolean;
}