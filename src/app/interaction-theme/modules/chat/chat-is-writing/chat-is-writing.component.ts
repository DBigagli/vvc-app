import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

@Component({
  selector: 'vvc-chat-is-writing',
  templateUrl: './chat-is-writing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatIsWritingComponent{

  @Input() context;

}
