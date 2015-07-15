<!doctype html>
<html><head>
    <title>Chat App Admin</title>
    <meta name="viewport" content="width=device-width, user-scalable=no">
    <script src="/static/js/admin.js"></script>
    <link rel="stylesheet" href="/static/css/admin.css">
</head><body>
    <h1>Chat App Admin</h1>
    <button id="clear-chat-button">Clear all /chat registrations</button><span id="clear-chat-result"></span>
    <script>
        $('#clear-chat-button').addEventListener('click', function() {
            clearRegistrations('chat');
        }, false);
    </script>
</body></html>