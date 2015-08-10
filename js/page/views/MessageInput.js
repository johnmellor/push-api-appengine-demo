import EventEmitter from "events";
import keyboardTemplate from "./templates/keyboard.hbs";
import emoji from "./conf/emoji";

export default class MessageInput extends EventEmitter {
  constructor(el) {
    super();
    this.container = el;
    this.form = el.querySelector('.message-form');

    this.container.addEventListener('submit', event => {
      event.preventDefault();
      this._onSubmit();
    });

    // send focus back to text input once clicked
    this.container.querySelector('button[type=submit]').addEventListener('click', _ => {
      this.container.message.focus();
    });

    // build the keyboard
    el.querySelector('.keyboard').innerHTML = keyboardTemplate({emoji});
  }

  _onSubmit() {
    this.emit('sendmessage', {message: this.form.message.value});
  }

  resetInput() {
    this.form.message.value = '';
  }

  inputFocused() {
    return this.form.message.matches(':focus');
  }

  inputIsEmpty() {
    return !this.form.message.value;
  }
}
