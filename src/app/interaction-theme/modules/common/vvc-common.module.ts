import { NgModule, ModuleWithProviders } from '@angular/core';

import { VvcSanitizePipe } from './pipes/vvc-sanitize.pipe';

@NgModule({
  imports: [],
  exports: [
    VvcSanitizePipe
  ],
  entryComponents: [
  ],
  declarations: [
    VvcSanitizePipe
  ]
})
export class VvcCommonModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: VvcCommonModule
    };
  }
}