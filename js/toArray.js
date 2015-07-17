export default function toArray(thing) {
  if (Array.from) return Array.from(thing);
  return Array.prototype.slice.call(thing);
}