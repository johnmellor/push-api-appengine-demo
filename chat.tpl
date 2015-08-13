<!DOCTYPE html>
<html><head>
  <title>Emojoy!</title>
  <meta name="viewport" content="width=device-width">
  <meta name="theme-color" content="#9C27B0">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" href="/static/imgs/hangouts.png" sizes="42x42">
  <link href="/static/css/app.css" rel="stylesheet">
</head><body>
  <div class="layout">
    <header class="toolbar">
      <h1>Emojoy!</h1>
      <a href="{{logout_url}}" class="logout">Logout</a>
    </header>
    <div class="global-warning"></div>
    <div class="chat-content">
      <ul class="chat-timeline"></ul>
    </div>
    <div class="message-input">
      <form action="/send" method="post" class="message-form">
        <input type="text" name="message" class="input-message" placeholder="Send emojis to the group" readonly>
        <button type="submit">
          <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </form>
      <div class="keyboard"></div>
    </div>
  </div>
  <script>
    var userId = '{{user_id}}';
  </script>
  <script src="/static/js/page.js"></script>
</body></html>
