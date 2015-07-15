<!DOCTYPE html>
<html><head>
  <title>Chat App</title>
  <meta name="viewport" content="width=device-width, user-scalable=no">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" href="/static/hangouts.png" sizes="42x42">
  <link href="/static/css/app.css" rel="stylesheet">
</head><body>
  <div class="layout">
    <header class="toolbar">
      <h1>Chat demo</h1>
      <a href="{{logout_url}}" class="logout">Logout</a>
    </header>
    <div class="chat-content">
      <ul class="chat-timeline">
        <li class="chat-item">
          <img class="avatar" width="40" height="40" src="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=40" srcset="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=80 2x, https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=120 3x" alt="User">
          <div class="bubble">
            <p>This is the thing the user has said. It may span multiple lines.</p>
            <time class="posted-date" datetime="TODO">Now</time>
          </div>
        </li>
        <li class="chat-item">
          <img class="avatar" width="40" height="40" src="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=40" srcset="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=80 2x, https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=120 3x" alt="User">
          <div class="bubble">
            <p>This is the thing the user has said. It may span multiple lines.</p>
            <time class="posted-date" datetime="TODO">Now</time>
          </div>
        </li>
        <li class="chat-item">
          <img class="avatar" width="40" height="40" src="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=40" srcset="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=80 2x, https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=120 3x" alt="User">
          <div class="bubble">
            <p>This is the thing the user has said. It may span multiple lines.</p>
            <time class="posted-date" datetime="TODO">Now</time>
          </div>
        </li>
        <li class="chat-item">
          <img class="avatar" width="40" height="40" src="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=40" srcset="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=80 2x, https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=120 3x" alt="User">
          <div class="bubble">
            <p>This is the thing the user has said. It may span multiple lines.</p>
            <time class="posted-date" datetime="TODO">Now</time>
          </div>
        </li>
        <li class="chat-item to-you">
          <img class="avatar" width="40" height="40" src="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=40" srcset="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=80 2x, https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=120 3x" alt="User">
          <div class="bubble">
            <p>This is the thing the user has said. It may span multiple lines.</p>
            <time class="posted-date" datetime="TODO">Now</time>
          </div>
        </li>
        <li class="chat-item">
          <img class="avatar" width="40" height="40" src="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=40" srcset="https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=80 2x, https://www.gravatar.com/avatar/{{email_hash}}?d=retro&amp;s=120 3x" alt="User">
          <div class="bubble">
            <p>This is the thing the user has said. It may span multiple lines.</p>
            <time class="posted-date" datetime="TODO">Now</time>
          </div>
        </li>
      </ul>

    </div>
    <form action="" class="message-input">
      <input type="text" class="input-message" placeholder="Send to group">
      <button type="submit">
        <svg viewBox="0 0 24 24">
          <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
        </svg>
      </button>
    </form>
  </div>
  <!--
  <section id="loading-page"></section>
  <section id="login-page">
    <div class="action-bar">Team chat</div>
    <form id="join-form">
      <label>Username: <input type="text" id="username"></label><br>
      <button>Join chatroom</button><span id="join-result"></span><span id="join-resultLink"></span>
    </form>
  </section>
  <section id="chat-page">
    <div id="workaround-header"></div>
    <div class="action-bar">
      Team chat
      <div class="action-buttons">
        <span id="active-username"></span>
        <a id="logout">Logout</a>
      </div>
    </div>
    <pre id="incoming-messages"></pre>
    <form id="send-form">
      <input type="text" id="message">
      <button></button><span id="send-result"></span><span id="send-resultLink"></span>
    </form>
  </section>
  -->
  <script>
    var AUTO_SUBSCRIBE_USERNAME = '{{user_from_get}}';
  </script>
  <script src="/static/js/localforage.js"></script>
  <script src="/static/js/app.js"></script>
</body></html>
