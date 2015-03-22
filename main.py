"""`main` is the top level module for your Bottle application."""

import bottle
from bottle import get, post, route, abort, redirect, template, request, response
import cgi
from google.appengine.api import app_identity, urlfetch, users
from google.appengine.ext import ndb
import json
import logging
import re
import os
import urllib

DEFAULT_GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send'

# Hand-picked from
# https://developer.android.com/google/gcm/server-ref.html#error-codes
PERMANENT_GCM_ERRORS = {'InvalidRegistration', 'NotRegistered',
                        'InvalidPackageName', 'MismatchSenderId'}

TYPE_STOCK = 1
TYPE_CHAT = 2
TYPE_CHAT_STALE = 3  # GCM told us the registration was no longer valid.

class GcmSettings(ndb.Model):
    SINGLETON_DATASTORE_KEY = 'SINGLETON'

    @classmethod
    def singleton(cls):
        return cls.get_or_insert(cls.SINGLETON_DATASTORE_KEY)

    endpoint = ndb.StringProperty(
            default=DEFAULT_GCM_ENDPOINT,
            indexed=False)
    sender_id = ndb.StringProperty(default="", indexed=False)
    api_key = ndb.StringProperty(default="", indexed=False)

# TODO: Probably cheaper to have a singleton entity with a repeated property?
class GCMRegistration(ndb.Model):
    type = ndb.IntegerProperty(required=True, choices=[TYPE_STOCK, TYPE_CHAT,
                                                       TYPE_CHAT_STALE])
    creation_date = ndb.DateTimeProperty(auto_now_add=True)

class FirefoxRegistration(ndb.Model):
    type = ndb.IntegerProperty(required=True, choices=[TYPE_STOCK, TYPE_CHAT,
                                                       TYPE_CHAT_STALE])
    creation_date = ndb.DateTimeProperty(auto_now_add=True)

class Message(ndb.Model):
    creation_date = ndb.DateTimeProperty(auto_now_add=True)
    text = ndb.StringProperty(indexed=False)

def thread_key(thread_name='default_thread'):
    return ndb.Key('Thread', thread_name)

@route('/setup', method=['GET', 'POST'])
def setup():
    # app.yaml should already have ensured that the user is logged in as admin.
    if not users.is_current_user_admin():
        abort(401, "Sorry, only administrators can access this page.")

    is_dev = os.environ.get('SERVER_SOFTWARE', '').startswith('Development')
    setup_scheme = 'http' if is_dev else 'https'
    setup_url = '%s://%s/setup' % (setup_scheme,
                                   app_identity.get_default_version_hostname())
    if request.url != setup_url:
        redirect(setup_url)

    result = ""
    settings = GcmSettings.singleton()
    if (request.forms.sender_id and request.forms.api_key and
            request.forms.endpoint):
        # Basic CSRF protection (will block some valid requests, like
        # https://1-dot-johnme-gcm.appspot.com/setup but ohwell).
        if request.get_header('Referer') != setup_url:
            abort(403, "Invalid Referer.")
        settings.endpoint = request.forms.endpoint
        settings.sender_id = request.forms.sender_id
        settings.api_key = request.forms.api_key
        settings.put()
        result = 'Updated successfully'
    return template('setup', result=result,
                             endpoint=settings.endpoint,
                             sender_id=settings.sender_id,
                             api_key=settings.api_key)

@get('/manifest.json')
def manifest():
    return {
        "short_name": "Chat App",
        "name": "Chat App",
        "icons": [{
            "src": "/static/hangouts.png",
            "sizes": "42x42",
            "type": "image/png"
        }],
        "display": "standalone",
        "start_url": "/chat/",
        "gcm_sender_id": GcmSettings.singleton().sender_id,
        "gcm_user_visible_only": True
    }

@get('/stock')
def stock_redirect():
    redirect("/stock/")

@get('/stock/')
def stock():
    """Single page stock app. Displays stock data and lets users register."""
    return template_with_sender_id('stock')

@get('/stock/admin')
def stock_admin():
    """Lets "admins" trigger stock price drops and clear stock registrations."""
    # Despite the name, this route has no credential checks - don't put anything
    # sensitive here!
    # This template doesn't actually use the sender_id, but we want the warning.
    return template_with_sender_id('stock_admin')

@get('/chat')
def chat_redirect():
    redirect("/chat/")

@get('/chat/')
def chat():
    """Single page chat app."""
    return template_with_sender_id('chat', user_from_get = request.query.get('user') or '')

@get('/chat/messages')
def chat_messages():
    """XHR to fetch the most recent chat messages."""
    messages = reversed(Message.query(ancestor=thread_key())
                               .order(-Message.creation_date).fetch(10))
    return "\n".join(re.sub(r'\r\n|\r|\n', ' ', cgi.escape(m.text))
                     for m in messages)

@get('/admin')
def legacy_chat_admin_redirect():
    redirect("/chat/admin")

@get('/chat/admin')
def chat_admin():
    """Lets "admins" clear chat registrations."""
    # Despite the name, this route has no credential checks - don't put anything
    # sensitive here!
    # This template doesn't actually use the sender_id, but we want the warning.
    return template_with_sender_id('chat_admin')

def template_with_sender_id(*args, **kwargs):
    settings = GcmSettings.singleton()
    if not settings.sender_id or not settings.api_key:
        abort(500, "You need to visit /setup to provide a GCM sender ID and "
                   "corresponding API key")
    kwargs['sender_id'] = settings.sender_id
    return template(*args, **kwargs)

@post('/stock/register')
def register_stock():
    return register(TYPE_STOCK)

@post('/chat/subscribe')
def register_chat():
    return register(TYPE_CHAT)

def register(type):
    """XHR adding a registration ID to our list."""
    response.status = 500
    logging.error("@@@@@@ register: endpoint:  " + request.forms.endpoint)
    logging.error("@@@@@@ register: subscription:  " + request.forms.subscription_id)

    if request.forms.subscription_id:
        if request.forms.endpoint == DEFAULT_GCM_ENDPOINT:
            registration = GCMRegistration.get_or_insert(request.forms.subscription_id,
                                                  type=type)
            registration.put()
            response.status = 201
        else:
            registration = FirefoxRegistration.get_or_insert(request.forms.endpoint,
                                                  type=type)
            registration.put()
            response.status = 201
    else:
        logging.error("no subscrptionid")
    logging.error("no dddd")

    return ""

@post('/stock/clear-registrations')
def clear_stock_registrations():
    ndb.delete_multi(GCMRegistration.query(GCMRegistration.type == TYPE_STOCK)
                                 .fetch(keys_only=True))
    ndb.delete_multi(FirefoxRegistration.query(FirefoxRegistration.type == TYPE_STOCK)
                                 .fetch(keys_only=True))
    return ""

@post('/chat/clear-registrations')
def clear_chat_registrations():
    ndb.delete_multi(GCMRegistration.query(GCMRegistration.type == TYPE_CHAT)
                                 .fetch(keys_only=True))
    ndb.delete_multi(GCMRegistration.query(GCMRegistration.type == TYPE_CHAT_STALE)
                                 .fetch(keys_only=True))

    ndb.delete_multi(FirefoxRegistration.query(FirefoxRegistration.type == TYPE_CHAT)
                                 .fetch(keys_only=True))
    ndb.delete_multi(FirefoxRegistration.query(FirefoxRegistration.type == TYPE_CHAT_STALE)
                                 .fetch(keys_only=True))

    return ""

@post('/stock/trigger-drop')
def send_stock():
    return send(TYPE_STOCK, '["May", 183]')

@post('/chat/send')
def send_chat():
    return send(TYPE_CHAT, request.forms.message)

def send(type, data):
    """XHR requesting that we send a push message to all users."""
    # Store message
    message = Message(parent=thread_key())
    message.text = data
    message.put()

    status = sendGCM(type, data)
    status = sendFirefox(type, data)

    response.status = 201

    return ""

def sendFirefox(type, data):
    logging.error("******* sendFirefox. Data: " + data)

    registration_keys = FirefoxRegistration.query(FirefoxRegistration.type == type) \
                                    .fetch(keys_only=True)
    registration_ids = [key.string_id() for key in registration_keys]
    if not registration_ids:
        return 200

    for pushEndpoint in enumerate(registration_ids):
        logging.error("@@@@ " + pushEndpoint[1])

        result = urlfetch.fetch(url=pushEndpoint[1],
                                payload="",
                                method=urlfetch.PUT)
        if result.status_code != 200:
            logging.error("Sending failed %d:\n%s" % (result.status_code,
                                                      result.content))

        ## todo deal with stale connections.
        
    return 200;

def sendGCM(type, data):
    logging.error("******* sendGCM")

    # TODO: Should limit batches to 1000 registration_ids at a time.
    registration_keys = GCMRegistration.query(GCMRegistration.type == type) \
                                    .fetch(keys_only=True)
    registration_ids = [key.string_id() for key in registration_keys]
    if not registration_ids:
        return 200

    post_data = json.dumps({
        'registration_ids': registration_ids,
        'data': {
            'data': data,  #request.forms.msg,
        },
        #"collapse_key": "score_update",
        #"time_to_live": 108,
        #"delay_while_idle": true,
    })
    settings = GcmSettings.singleton()
    result = urlfetch.fetch(url=settings.endpoint,
                            payload=post_data,
                            method=urlfetch.POST,
                            headers={
                                'Content-Type': 'application/json',
                                'Authorization': 'key=' + settings.api_key,
                            },
                            validate_certificate=True,
                            allow_truncated=True)
    if result.status_code != 200:
        logging.error("Sending failed %d:\n%s" % (result.status_code,
                                                  result.content))
    try:
        stale_keys = []
        for i, res in enumerate(json.loads(result.content)['results']):
            if 'error' in res and res['error'] in PERMANENT_GCM_ERRORS:
                stale_keys.append(registration_keys[i])
        stale_registrations = ndb.get_multi(stale_keys)
        for registration in stale_registrations:
            registration.type = TYPE_CHAT_STALE
        ndb.put_multi(stale_registrations)
    except:
        logging.exception("Failed to cull stale registrations")
    return result.status_code


bottle.run(server='gae', debug=True)
app = bottle.app()
