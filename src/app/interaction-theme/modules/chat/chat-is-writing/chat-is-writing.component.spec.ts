import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatIsWritingComponent } from './chat-is-writing.component';

describe('ChatIsWritingComponent', () => {
  let component: ChatIsWritingComponent;
  let fixture: ComponentFixture<ChatIsWritingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChatIsWritingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatIsWritingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
