import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Import Custom Modules from folder
import { TopBarModule } from "./modules/top-bar/top-bar.module";
import {ChatModule} from "./modules/chat/chat.module";

import {
  //TopBarModule,
  //ChatModule,
  ChatPanelsModule,
  MessagesModule,
  ClosePanelModule,
  LoadingPanelModule,
  MinimizedModule,
  DataCollectionModule,
  MultimediaModule,
  QueueModule,
  CbnModule,
  InboundModule
} from '@vivocha/client-interaction-layout';

const layoutModules = [
  TopBarModule,
  DataCollectionModule,
  QueueModule,
  ChatModule,
  ChatPanelsModule,
  MessagesModule,
  MultimediaModule,
  ClosePanelModule,
  LoadingPanelModule,
  MinimizedModule,
  CbnModule,
  InboundModule
];

@NgModule({
  imports: [
    CommonModule,
    ...layoutModules
  ],
  exports: [
    ...layoutModules
  ],
  declarations: [

  ]
})
export class InteractionThemeModule { }
