import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediaBinComponent } from './media-bin.component';

describe('MediaBinComponent', () => {
  let component: MediaBinComponent;
  let fixture: ComponentFixture<MediaBinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaBinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MediaBinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
