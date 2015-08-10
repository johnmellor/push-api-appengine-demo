var emoji = require('emojilib');
var output = {};

emoji.keys.forEach(function(emojiKey) {
  var emojiDetails = emoji[emojiKey];

  if (!emojiDetails.char) return;

  // there aren't enough flags to make it worth while
  if (emojiDetails.category == 'flags') return;

  if (!output[emojiDetails.category]) {
    output[emojiDetails.category] = [];
  }

  output[emojiDetails.category].push(emojiDetails.char);
});

module.exports = output;