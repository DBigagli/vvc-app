import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TopBarComponent } from './top-bar/top-bar.component';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule
  ],
  exports: [
    TopBarComponent
  ],
  declarations: [TopBarComponent]
})
export class TopBarModule { }
