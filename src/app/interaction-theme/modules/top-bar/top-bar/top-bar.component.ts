import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'vvc-top-bar-turismo-torino',
  templateUrl: './top-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopBarComponent {

  @Input() context;
  @Output() onMinimize = new EventEmitter();
  @Output() onClose = new EventEmitter();
  @Output() onSurvey = new EventEmitter();
  @Output() onRemove = new EventEmitter();
  @Output() onHideChat = new EventEmitter();
  @Output() onVoiceUpgrade = new EventEmitter();
  @Output() onVideoUpgrade = new EventEmitter();
  @Output() onMaximize = new EventEmitter();
  @Output() onDebugConsole = new EventEmitter();
  @Output() onStartRecording = new EventEmitter();

  @Input() interactionState = "First";

  isMenuVisible = false;
  closeAttempts = 0;

  constructor() {}

  closeContact() {
    this.onClose.emit();
  }
  closeMenu() {
    this.isMenuVisible = false;
  }
  hasMenu() {
    let itemNumber = 0;
    if (this.context && !this.context.isMediaConnecting && !this.context.cbnMode) {
      if (this.context.canMinimize) {
        itemNumber++;
      }
      if (this.context.canStartAudio && !this.context.isMediaConnected) {
        itemNumber++;
      }
      if (this.context.canStartVideo && !this.context.isMediaConnected) {
        itemNumber++;
      }
      if ((this.context.isMediaMinimized && this.context.isMediaConnected) && !this.context.isAutoChat) {
        itemNumber++;
      }
    }
    return (itemNumber > 1);
  }
  removeApp() {
    this.closeContact();
  }
  showMenu() {
    this.isMenuVisible = true;
  }
  clickDebugConsole() {
    this.onDebugConsole.emit();
  }

  startRecording() {
    this.onStartRecording.emit();
  }

  isIdle() {
    return this.interactionState === 'Idle';
  }

  isRecording() {
    return this.interactionState === 'Recording';
  }

  isProcessing() {
    return this.interactionState === 'Processing';
  }

  isSpeaking() {
    return this.interactionState === 'Speaking';
  }
}
