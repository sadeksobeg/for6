import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Resource } from '../models/studio.models';

@Injectable({
  providedIn: 'root'
})
export class StudioMediaService {
  private resourcesSubject = new BehaviorSubject<Resource[]>([]);
  resources$ = this.resourcesSubject.asObservable();

  constructor() {}

  addResource(file: File): Promise<Resource> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      
      if (file.type.startsWith('video/')) {
        this.loadVideoMetadata(url, file).then(resource => {
          this.addToResources(resource);
          resolve(resource);
        }).catch(reject);
      } else if (file.type.startsWith('audio/')) {
        this.loadAudioMetadata(url, file).then(resource => {
          this.addToResources(resource);
          resolve(resource);
        }).catch(reject);
      } else if (file.type.startsWith('image/')) {
        this.loadImageMetadata(url, file).then(resource => {
          this.addToResources(resource);
          resolve(resource);
        }).catch(reject);
      } else {
        reject(new Error('Unsupported file type'));
      }
    });
  }

  private loadVideoMetadata(url: string, file: File): Promise<Resource> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      
      video.onloadedmetadata = () => {
        // Generate thumbnail
        this.generateVideoThumbnail(video).then(thumbnail => {
          const resource: Resource = {
            id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            path: url,
            type: 'video',
            duration: video.duration,
            fps: 25, // Default, would need more complex detection
            width: video.videoWidth,
            height: video.videoHeight,
            thumbnail: thumbnail
          };
          resolve(resource);
        }).catch(() => {
          // Resolve without thumbnail if generation fails
          const resource: Resource = {
            id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            path: url,
            type: 'video',
            duration: video.duration,
            fps: 25,
            width: video.videoWidth,
            height: video.videoHeight
          };
          resolve(resource);
        });
      };
      
      video.onerror = () => reject(new Error('Failed to load video metadata'));
      video.src = url;
    });
  }

  private loadAudioMetadata(url: string, file: File): Promise<Resource> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        const resource: Resource = {
          id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          path: url,
          type: 'audio',
          duration: audio.duration
        };
        resolve(resource);
      };
      
      audio.onerror = () => reject(new Error('Failed to load audio metadata'));
      audio.src = url;
    });
  }

  private loadImageMetadata(url: string, file: File): Promise<Resource> {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      
      img.onload = () => {
        const resource: Resource = {
          id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          path: url,
          type: 'image',
          duration: 5, // Default 5 seconds for images
          width: img.naturalWidth,
          height: img.naturalHeight,
          thumbnail: url
        };
        resolve(resource);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  private generateVideoThumbnail(video: HTMLVideoElement): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      canvas.width = 160;
      canvas.height = 90;
      
      video.currentTime = Math.min(1, video.duration * 0.1); // 10% into video or 1 second
      
      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          resolve(thumbnail);
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  private addToResources(resource: Resource): void {
    const resources = this.resourcesSubject.value;
    resources.push(resource);
    this.resourcesSubject.next(resources);
  }

  removeResource(resourceId: string): void {
    const resources = this.resourcesSubject.value;
    const index = resources.findIndex(r => r.id === resourceId);
    if (index >= 0) {
      // Clean up blob URL
      const resource = resources[index];
      if (resource.path.startsWith('blob:')) {
        URL.revokeObjectURL(resource.path);
      }
      resources.splice(index, 1);
      this.resourcesSubject.next(resources);
    }
  }

  getResource(resourceId: string): Resource | null {
    const resources = this.resourcesSubject.value;
    return resources.find(r => r.id === resourceId) || null;
  }
}