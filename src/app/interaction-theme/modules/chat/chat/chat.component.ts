import {ChangeDetectionStrategy, Component, Input, ViewChild} from '@angular/core';
import {VvcAutoScrollDirective} from '../vvc-auto-scroll.directive';

@Component({
  selector: 'vvc-chat-turismo-torino',
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent {

  @ViewChild(VvcAutoScrollDirective, {static: true}) vvcAutoScroll: VvcAutoScrollDirective;

  _context;
  msgCounter;

  @Input()
  set context(context){
    this._context = context;
    if (this._context.messages && this._context.messages.length && this._context.messages.length != this.msgCounter){
      this.msgCounter = this._context.messages.length;
      this.forceScrollDown();
    }

  };
  get context(){
    return this._context;
  }

  public forceScrollDown(): void {
    setTimeout( () => {
      this.vvcAutoScroll.forceScrollDown();
    }, 100);

  }
}
