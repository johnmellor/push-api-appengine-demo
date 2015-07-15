window.$ = document.querySelector.bind(document);

function setStatus(buttonName, className, text) {
    var result = $('#' + buttonName + '-result');
    result.textContent = " " + text;
    if (!text)
        return;
    result.className = className;
    console.log(buttonName + " " + className + ": " + text);
}

function clearRegistrations(type) {
    console.log("Sending clear " + type + " registrations to " + location.hostname + "...");
    var statusId = 'clear-' + type;
    setStatus(statusId, '', "");

    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
        if (('' + xhr.status)[0] != '2') {
            setStatus(statusId, "Server error " + xhr.status
                                + ": " + xhr.statusText);
        } else {
            setStatus(statusId, 'success', "Cleared.");
        }
    };
    xhr.onerror = xhr.onabort = function() {
        setStatus(statusId, 'fail', "Failed to send!");
    };
    xhr.open('POST', '/' + type + '/clear-registrations');
    xhr.send();
}