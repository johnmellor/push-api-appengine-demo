"""`main` is the top level module for your Bottle application."""

import json
import urllib
import bottle
from bottle import get, post, abort, template, request, response
from google.appengine.api import urlfetch, users
from google.appengine.ext import ndb

GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send'

TYPE_STOCK = 1
TYPE_CHAT = 2

class Settings(ndb.Model):
    SINGLETON_DATASTORE_KEY = 'SINGLETON'

    @classmethod
    def singleton(cls):
        return cls.get_or_insert(cls.SINGLETON_DATASTORE_KEY)

    sender_id = ndb.StringProperty(default="", indexed=False)
    api_key = ndb.StringProperty(default="", indexed=False)

# TODO: Probably cheaper to have a singleton entity with a repeated property?
class Registration(ndb.Model):
    type = ndb.IntegerProperty(required=True, choices=[TYPE_STOCK, TYPE_CHAT])
    creation_date = ndb.DateTimeProperty(auto_now_add=True)

@get('/setup')
@post('/setup')
def setup():
    # app.yaml should already have ensured that the user is logged in as admin.
    if not users.is_current_user_admin():
        abort(401, "Sorry, only administrators can access this page.")
    result = ""
    settings = Settings.singleton()
    if request.forms.sender_id and request.forms.api_key:
        settings.sender_id = request.forms.sender_id
        settings.api_key = request.forms.api_key
        settings.put()
        result = 'Updated successfully'
    return template('setup', result=result,
                             sender_id=settings.sender_id,
                             api_key=settings.api_key)

@get('/stock')
def stock():
    """Single page stock app. Displays stock data and lets users register."""
    return template_with_sender_id('stock')

@get('/swstock')
def swstock():
    """Single page stock app (old version)."""
    return template_with_sender_id('swstock')

@get('/swstock2')
def swstock2():
    """Old path alias."""
    redirect("/stock")

@get('/admin')
def admin():
    """Lets "admins" trigger stock price drops and clear registrations."""
    # This template doesn't actually use the sender_id, but we want the warning.
    return template_with_sender_id('admin')

@get('/stock/admin')
def stock_admin():
    """Old path alias."""
    redirect("/stock/admin")

@get('/chat')
def chat():
    """Single page chat app."""
    return template_with_sender_id('chat', user_from_get = request.query.get('user') or '')

def template_with_sender_id(*args, **kwargs):
    settings = Settings.singleton()
    if not settings.sender_id or not settings.api_key:
        abort(500, "You need to visit /setup to provide a GCM sender ID and "
                   "corresponding API key")
    kwargs['sender_id'] = settings.sender_id
    return template(*args, **kwargs)

@post('/stock/register')
def register_stock():
    return register(TYPE_STOCK)

@post('/chat/register')
def register_chat():
    return register(TYPE_CHAT)

def register(type):
    """XHR adding a registration ID to our list."""
    if request.forms.registration_id:
        if request.forms.endpoint != GCM_ENDPOINT:
            abort(500, "Push servers other than GCM are not yet supported.")

        registration = Registration.get_or_insert(request.forms.registration_id,
                                                  type=type)
        registration.put()
    response.status = 201
    return ""

@post('/stock/clear-registrations')
def clear_stock_registrations():
    ndb.delete_multi(Registration.query(Registration.type == TYPE_STOCK)
                                 .fetch(keys_only=True))
    return ""

@post('/chat/clear-registrations')
def clear_chat_registrations():
    ndb.delete_multi(Registration.query(Registration.type == TYPE_CHAT)
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
    # TODO: Should limit batches to 1000 registration_ids at a time.
    registration_ids = [r.key.string_id() for r in Registration.query(
                        Registration.type == type).iter()]
    if not registration_ids:
        abort(500, "No registered devices.")
    post_data = json.dumps({
        'registration_ids': registration_ids,
        'data': {
            'data': data,  #request.forms.msg,
        },
        #"collapse_key": "score_update",
        #"time_to_live": 108,
        #"delay_while_idle": true,
    })
    settings = Settings.singleton()
    result = urlfetch.fetch(url=GCM_ENDPOINT,
                            payload=post_data,
                            method=urlfetch.POST,
                            headers={
                                'Content-Type': 'application/json',
                                'Authorization': 'key=' + settings.api_key,
                            })
    if result.status_code != 200:
        abort(500, "Sending failed (status code %d)." % result.status_code)
    #return "%d message(s) sent successfully." % len(registration_ids)
    response.status = 202
    return ""

bottle.run(server='gae', debug=True)
app = bottle.app()
