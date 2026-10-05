import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPost } from './edit-post';

describe('EditPost', () => {
  let component: EditPost;
  let fixture: ComponentFixture<EditPost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPost]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPost);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
