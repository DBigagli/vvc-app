import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from './chat/chat.component';
import { ChatAreaComponent } from './chat-area/chat-area.component';
import { ChatIsWritingComponent } from './chat-is-writing/chat-is-writing.component';
import { TranslateModule } from '@ngx-translate/core';
import { VvcAutoScrollDirective } from './vvc-auto-scroll.directive';
import { VvcCommonModule } from './../common/vvc-common.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    VvcCommonModule
  ],
  exports: [ChatComponent, ChatAreaComponent, ChatIsWritingComponent, VvcAutoScrollDirective],
  declarations: [ChatComponent, ChatAreaComponent, ChatIsWritingComponent, VvcAutoScrollDirective]
})
export class ChatModule { }
