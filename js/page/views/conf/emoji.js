// This runs in node, the export of
// this is stringified & browserified

var emoji = require('emojilib');
var output = {};

// These emoji don't appear to work
var omitList = [
  'relaxed',
  'point_up',
  'v'
];

emoji.keys.forEach(function(emojiKey) {
  var emojiDetails = emoji[emojiKey];
  if (!emojiDetails.char) return;

  var iterator = emojiDetails.char[Symbol.iterator]();
  iterator.next();

  // this looks like more than one char, skipping
  if (!iterator.next().done) return;

  // there aren't enough flags to make it worth while
  if (emojiDetails.category == 'flags') return;

  if (!output[emojiDetails.category]) {
    output[emojiDetails.category] = [];
  }

  output[emojiDetails.category].push(emojiDetails.char);
});

module.exports = output;