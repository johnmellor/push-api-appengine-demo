export default function toMessageObj(serverMessageObj) {
  return {
    text: serverMessageObj.text,
    date: new Date(serverMessageObj.date),
    userId: serverMessageObj.user,
    id: serverMessageObj.id
  };
}