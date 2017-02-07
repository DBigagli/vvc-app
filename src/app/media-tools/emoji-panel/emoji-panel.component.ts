import {Component, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'vvc-emoji-panel',
  templateUrl: './emoji-panel.component.html',
  styleUrls: ['./emoji-panel.component.scss']
})
export class EmojiPanelComponent {

  @Output() emoji = new EventEmitter();
  emojis = ['😀', '😬', '😁', '😂', '😃', '😄', '😅', '😆', '😇', '😉', '😊', '🙂', '🙃', '☺️', '😋', '😌', '😍', '😘', '😗', '😙',
    '😚', '😜', '😝', '😛', '🤑', '🤓', '😎', '🤗', '😏', '😶', '😐', '😑', '😒', '🙄', '🤔', '😳', '😞', '😟', '😠', '😡', '😔',
    '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '😤', '😮', '😱', '😨', '😰', '😯', '😦', '😧', '😢', '😥', '😪', '😓', '😵', '😲',
    '🤐', '😷', '🤒', '🤕', '😴', '💤', '💩', '😈', '👿', '👹', '👺', '💀', '👻', '👽', '🤖'];

  addEmoji(em) {
    this.emoji.emit({ text: em });
  }
  constructor() { }



}
