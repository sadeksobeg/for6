import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudioActionButtonComponent } from './studio-action-button.component';

describe('StudioActionButtonComponent', () => {
  let component: StudioActionButtonComponent;
  let fixture: ComponentFixture<StudioActionButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudioActionButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudioActionButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
