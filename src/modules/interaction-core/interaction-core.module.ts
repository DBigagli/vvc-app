import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { reducers } from './store';

import * as fromServices from './services';

export function createTranslateLoader(http: HttpClient) {
  const reg = /(\/a\/\w+\/api\/v2\/public\/campaigns\/\w+\/\w+\/interaction\/)\w+(\/[^\/]+\/[^\/]+)\/main\.html/;
  const res = location.pathname.match(reg);
  const url = location.origin + res[1];
  return new TranslateHttpLoader(http, url, res[2] + '/strings.json');
}

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    StoreModule.forRoot(reducers, {}),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    })
  ],
  providers: [
    ...fromServices.services
  ]
})
export class InteractionCoreModule { }
