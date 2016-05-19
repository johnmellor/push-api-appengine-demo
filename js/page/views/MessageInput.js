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

    this.container.addEventListener('click', e => this._onContainerClick(e));
    this._initKeyboard();
  }

  _onContainerClick(event) {
    if (this.container.classList.contains('active')) return;
    this.container.classList.add('active');
    this.emit('keyboardopen');

    let outCheck = event => {
      if (event.target.closest('.message-input')) return;
      
      if (this.container.animate) {
        this.container.classList.add('exiting');
        this.container.animate([
          {transform: 'translateY(' + (-this.keyboard.offsetHeight) + 'px)'},
          {transform: 'none'}
        ], {
          duration: 200,
          easing: 'ease-out'
        }).onfinish = _ => {
          this.container.classList.remove('active');
          this.container.classList.remove('exiting');
        };
      }
      else {
        this.container.classList.remove('active');
      }

      document.removeEventListener('click', outCheck, true);
    };

    // TODO: can this be added so it doesn't pick up this event?
    document.addEventListener('click', outCheck);
    
    if (this.container.animate) {
      this.container.animate([
        {transform: 'translateY(' + this.keyboard.offsetHeight + 'px)'},
        {transform: 'none'}
      ], {
        duration: 200,
        easing: 'ease-out'
      }).onfinish = _ => {
        this.keys.classList.add('render-all');
      };
    }
    else {
      requestAnimationFrame(() => {
        this.keys.classList.add('render-all');
      });
    }
  }

  _initKeyboard() {
    // build the keyboard
    this.keyboard = this.container.querySelector('.keyboard');
    this.keyboard.innerHTML = keyboardTemplate({emoji});
    this.keys = this.container.querySelector('.keys');

    // events
    this.container.querySelector('.categories').addEventListener('click', e => this._onCategoryClick(e));
    this.keys.addEventListener('click', e => this._onEmojiKeyClick(e));
    this.container.querySelector('.space button').addEventListener('click', e => this._onSpaceClick(e));
    this.container.querySelector('.del').addEventListener('click', e => this._onDelClick(e));
    document.addEventListener('keydown', e => this._onKeyDown(e));

    // events for mouse/touchstart effect
    this._initButtonActiveStyle(this.keyboard);
  }

  _initButtonActiveStyle(el) {
    let activeEl;

    let end = event => {
      if (!activeEl) return;
      activeEl.classList.remove('active');
      document.removeEventListener('mouseup', end);
      activeEl = undefined;
    };

    let start = event => {
      let button = event.target.closest('button');
      if (!button) return;
      activeEl = button;
      activeEl.classList.add('active');
      document.addEventListener('mouseup', end);
    };

    el.addEventListener('touchstart', start);
    el.addEventListener('mousedown', start);
    el.addEventListener('touchend', end);
  }

  _addToInput(val) {
    // limit to 200 chars
    let newMessage = this.form.message.value + val;
    let msg = '';
    let i = 0;
    for (let codepoint of newMessage) {
      if (i > 200) break;
      msg += codepoint;
    }
    this.form.message.value = msg;
    this.form.message.scrollLeft = this.form.message.scrollWidth;
  }

  _del() {
    let codePoints = [];
    for (let codePoint of this.form.message.value) codePoints.push(codePoint);
    this.form.message.value = codePoints.slice(0, -1).join('');
  }

  _onKeyDown(event) {
    if (!this.container.classList.contains('active')) return;
    if (event.keyCode == 8) { // backspace
      event.preventDefault();
      this._del();
    }
    else if (event.keyCode == 13) { // enter
      event.preventDefault();
      this._onSubmit();
    }
    else if (event.keyCode == 32) { // space
      event.preventDefault();
      this._addToInput(' ');
    }
    else if (event.keyCode >= 48 && event.keyCode <= 90) {
      let allKeys = this.keys.querySelectorAll('button');
      this._addToInput(allKeys[Math.floor(Math.random() * allKeys.length)].textContent);
    }
  }

  _onDelClick(event) {
    let button = event.currentTarget;
    this._del();
    button.blur();
    event.preventDefault();
  }

  _onSpaceClick(event) {
    let button = event.currentTarget;
    this._addToInput(' ');
    button.blur();
    event.preventDefault();
  }

  _onEmojiKeyClick(event) {
    let button = event.target.closest('button');
    if (!button) return;
    this._addToInput(button.textContent);
    button.blur();
    event.preventDefault();
  }

  _onCategoryClick(event) {
    let button = event.target.closest('button');
    if (!button) return;

    let firstInCategory = this.keys.querySelector('.' + button.getAttribute('data-target'));
    this.keys.scrollLeft = firstInCategory.offsetLeft;
    button.blur();
    event.preventDefault();
  }

  _onSubmit() {
    let message = this.form.message.value.trim();
    if (!message) return;
    this.emit('sendmessage', {message});
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
