<!doctype html>
<html><head>
    <title>Chat App</title>
    <meta name="viewport" content="width=device-width, user-scalable=no">
    <link rel="icon" type="image/png" href="/static/hangouts.png" sizes="42x42">
    <link href="/static/roboto.css" rel="stylesheet" type="text/css">
    <style>
        html, body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
        }
        #loading-page {
            position: fixed;
            top: 0; right: 0; bottom: 0; left: 0;
            background: white;
            z-index: 2;
        }
        #login-page {
            position: fixed;
            top: 0; right: 0; bottom: 0; left: 0;
            background: white;
            opacity: 1;
            transition: opacity 0.5s;
        }
        #workaround-header {
            display: none;
            height: 56px;
            background-color: #0a7e07;
        }
        .action-bar {
            background-color: #259b24;
            color: white;

            line-height: 64px;
            font-size: 24px;

            background-image: url("/static/hamburger.svg");
            background-size: 24px 24px;
            background-repeat: no-repeat;
            background-position: 24px center;
            padding-left: 72px;
        }
        #join-form, #send-form, #incoming-messages {
            margin: 1em;
        }
        #join-form, #join-form *, #send-form, #send-form *, #incoming-messages {
            font-size: 16px;
            vertical-align: middle;
        }
        #message {
            line-height: 32px;
        }
        #send-form > button {
            width: 48px;
            height: 48px;
            background: url(/static/send.png);
            background-size: contain;
            border: none;
            padding: 0;
            margin: 0;
        }
        .success {
            color: green;
            font-style: italic;
        }
        .fail {
            color: red;
            font-style: italic;
            font-weight: bold;
        }
    </style>
</head><body>
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
        <div class="action-bar">Team chat</div>
        <pre id="incoming-messages"></pre>
        <form id="send-form">
            <input type="text" id="message">
            <button></button><span id="send-result"></span><span id="send-resultLink"></span>
        </form>
    </section>
    <script src="/static/localforage.js"></script>
    <script>
        var $ = document.querySelector.bind(document);

        function crazyHack() {
            if (window.outerHeight == 0) {
                setTimeout(crazyHack, 32);
                return;
            }
            // CRAZY HACK: When opening Chrome after receiving a push message in
            // the background, the top controls manager can get confused,
            // causing the omnibox to permanently overlap the top 56 pixels of
            // the page. Detect this and work around it with a spacer div.
            console.log("screen.height = " + screen.height);
            console.log("window.outerHeight = " + window.outerHeight);
            if (screen.height - window.outerHeight == 25) {
                $('#workaround-header').style.display = 'block';
            }
        }
        crazyHack();
        window.addEventListener("resize", crazyHack);

        var USER_FROM_GET = '{{user_from_get}}';
        if (USER_FROM_GET) {
            localforage.setItem('username', USER_FROM_GET)
            gotUsername(USER_FROM_GET);
        }

        localforage.getItem('username').then(gotUsername);

        function gotUsername(username) {
            if (username != null) {
                $('#username').value = username;
                showChatScreen(true);
            }
            $('#loading-page').style.display = 'none';
        }

        function setStatus(buttonName, className, text, responseText) {
            var result = $('#' + buttonName + '-result');
            var resultLink = $('#' + buttonName + '-resultLink');
            if (className == 'success')
                result.textContent = ""; // Don't bother notifying success.
            else
                result.textContent = " " + text;
            if (responseText)
                resultLink.innerHTML = " <a href='data:text/html," + encodeURIComponent(responseText) + "'>(Full message)</a>";
            if (!text)
                return;
            result.className = className;
            resultLink.className = className;
            if (buttonName == 'join' && className == 'fail')
                $('#join-form > button').disabled = false;
            console.log(buttonName + " " + className + ": " + text);
        }

        var supportsPush = ('push' in navigator) &&
                           ('Notification' in window) &&
                           ('serviceWorker' in navigator);
        if (!supportsPush) {
            setStatus('join', 'fail',
                      "Your browser does not support push notifications; you won't be able to receive messages.");
            setStatus('send', 'fail',
                      "Your browser does not support push notifications; you won't be able to receive messages.");
        }

        $('#join-form').addEventListener('submit', function(evt) {
            evt.preventDefault();
            $('#join-form > button').disabled = true;
            setStatus('join', '', "");

            if (!supportsPush) {
                showChatScreen(false);
                return;
            }

            navigator.serviceWorker.register('/static/chat-sw.js').then(function(sw) {
                registerForPush();
            }, function(error) {
                console.error(error);
                setStatus('register', 'fail', "SW registration rejected!");
            });
        });

        function registerForPush() {
            var SENDER_ID = '{{sender_id}}';
            navigator.push.register(SENDER_ID).then(function(pr) {
                console.log(JSON.stringify(pr));
                sendRegistrationToBackend(pr.pushEndpoint,
                                          pr.pushRegistrationId);
            }, function() {
                setStatus('join', 'fail', "API call unsuccessful!");
            });
        }

        function sendRegistrationToBackend(endpoint, registrationId) {
            console.log("Sending registration to johnme-gcm.appspot.com...");

            var formData = new FormData();
            formData.append('endpoint', endpoint);
            formData.append('registration_id', registrationId);

            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
                if (('' + xhr.status)[0] != '2') {
                    setStatus('join', 'fail', "Server error " + xhr.status
                                              + ": " + xhr.statusText);
                } else {
                    setStatus('join', 'success', "Registered.");
                    showChatScreen(false);
                }
            };
            xhr.onerror = xhr.onabort = function() {
                setStatus('join', 'fail', "Failed to send registration ID!");
            };
            xhr.open('POST', '/chat/register');
            xhr.send(formData);
        }

        function showChatScreen(immediate) {
            if (immediate) {
                $('#login-page').style.display = 'none';
                return;
            }
            localforage.setItem('username', $('#username').value);
            $('#login-page').style.opacity = 0;
            setTimeout(function() {
                $('#login-page').style.display = 'none';
            }, 510);
        }

        function updateText() {
            localforage.getItem('messages').then(function(text) {
                $('#incoming-messages').textContent = text;
                // Poll for new messages; TODO: instead, postMessage from SW.
                setTimeout(updateText, 100);
            });
        }
        updateText();

        $('#send-form').addEventListener('submit', function(evt) {
            evt.preventDefault();
            console.log("Sending message to johnme-gcm.appspot.com...");
            setStatus('send', '', "");

            var formData = new FormData();
            formData.append('message',
                $('#username').value + ": " + $('#message').value);

            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
                if (('' + xhr.status)[0] != '2') {
                    setStatus('send', 'fail', "Server error " + xhr.status
                                              + ": " + xhr.statusText, xhr.responseText);
                } else {
                    setStatus('send', 'success', "Triggered.");
                    $('#message').value = "";
                }
            };
            xhr.onerror = xhr.onabort = function() {
                setStatus('send', 'fail', "Failed to send!");
            };
            xhr.open('POST', '/chat/send');
            xhr.send(formData);
        });
    </script>

</body></html>
