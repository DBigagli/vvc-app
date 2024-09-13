import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';

@Component({
  selector: 'vvc-chat-area',
  templateUrl: './chat-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatAreaComponent {

  @ViewChild('box', {static: true}) box: ElementRef;
  @Input() context;
  @Input() readonly;
  @Output() onSendText = new EventEmitter();
  @Output() toggleEmojiPanel = new EventEmitter();
  @Output() showUploadPanel = new EventEmitter();
  @Output() isVisitorWriting = new EventEmitter();

  isWritingTimer;
  isWritingTimeout = 20000;

  appendText(value) {
    this.box.nativeElement.value += value;
    this.box.nativeElement.focus();
  }
  canShowUpload() {
    return (this.context &&
            this.context.canUploadFile &&
            !this.context.isAutoChat &&
            !(this.context.variables.hideUploadWithBot && this.context.agent.is_bot));
  }
  clearIsWriting() {
    clearTimeout(this.isWritingTimer);
    this.isWritingTimer = null;
  }
  isWriting() {
    if (!this.isWritingTimer) {
      this.isVisitorWriting.emit();
      this.isWritingTimer = setTimeout( () => {
        this.clearIsWriting();
      }, this.isWritingTimeout);
    }
  }
  showUpload() {
    if (this.readonly) {
      return;
    }
    this.showUploadPanel.emit();
  }
  toggleEmoji() {
    if (this.readonly) {
      return;
    }
    this.toggleEmojiPanel.emit();
  }
  sendText(value) {
    if (this.readonly) {
      return;
    }
    if (value !== '') {
      this.onSendText.emit(value);
      this.clearIsWriting();
    }
  }
}
