var emoji = require('./js/page/views/conf/emoji.js');
console.log(
  Object.keys(emoji).map(function(key) {
    return emoji[key];
  }).join('').replace(/,/g, '')
);