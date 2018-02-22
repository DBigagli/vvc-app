import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { InteractionThemeModule } from './interaction-theme/interaction-theme.module';
import { InteractionCoreModule } from './interaction-core/interaction-core.module';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    InteractionCoreModule,
    InteractionThemeModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
