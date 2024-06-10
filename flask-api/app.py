"""chat-ws.py - a chatbot web service

It currently has just one endpoint, Chat, for chat completion.

Can be configured to use either OpenAI or a locally installed llama3:8gb model.

Prereqs:
* pip install flask, jwt, flask-cors, ollama, openai, bcrypt, waitress
* Configure the environment variables below
"""

from os import getenv
from time import time
import json
from waitress import serve
import jwt
import jwt.algorithms
from jwt import decode, get_unverified_header
import ollama
import openai
from cryptography.hazmat.primitives import serialization
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
app = Flask(__name__)

# pylint: disable = import-error, line-too-long, too-many-return-statements

# Configuration
    # MSAL configuration
TENANT_ID = "e0a687bb-3d18-469c-9e8b-c93af47275ef"
TENANT_NAME = "chatapp123b2c"
USER_FLOW_NAME = "B2C_1_chatapp_signup_signin"
AUDIENCE  =  "aa189e99-139b-4c10-a124-d04c23138633"             # Encarta ID of the chat app API created for the web service app registration
SCOPE     = "Chat.chat"                                         # Encarta Scope required for the chatting, should be in token claim
ISSUER    = f"https://{TENANT_NAME}.b2clogin.com/{TENANT_ID}/v2.0/" # Token issuer
JWK_DISCOVERY_URL = f"https://{TENANT_NAME}.b2clogin.com/{TENANT_NAME}.onmicrosoft.com/{USER_FLOW_NAME}/discovery/v2.0/keys"


    # XXX - TODO; remove this once I figure out how to manage it in MSAL
AUTH_ALLOWED_EMAILS = json.loads(getenv("CA_ALLOWED_EMAILS"))   # List of allowed emails

    # Production vs development mode
DEVELOPMENT = getenv("CA_DEVELOPMENT")                          # Set variable to development mode
CORS_ORIGINS = json.loads(getenv("CA_CORS_ORIGINS"))            # CORS origins for development mode

    # Chat API configuration (OpenAI vs local llama/ollama:8gb)
USE_OPENAI = True                                               # Use OpenAI API. False to use llama/ollama:8gb
OPENAI_API_KEY = getenv("OPENAI_API_KEY")                       # OpenAI API key. Get from OpenAI.

jwks = requests.get(JWK_DISCOVERY_URL).json()  # Cache this. # pylint: disable=missing-timeout
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS}})

def trace(msg):
    """Trace debugging"""
    print (msg)

def trace_error(msg):
    """Trace error"""
    print (msg)

@app.route("/chat", methods=['POST'])
def chat():
    """A simple method to chat with the chatbot"""
    # Validate the basic auth token
    auth_header = request.headers.get("Authorization")
    validation_msg = validate_auth_header(auth_header)
    if validation_msg is not None:
        print ("Auth error: ", validation_msg)
        return jsonify({"error": validation_msg}), 401

    messages = request.get_json()
    trace (messages)

    if USE_OPENAI or not DEVELOPMENT:
        # Use OpenAI
        openai.api_key = OPENAI_API_KEY
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.2,
        )
        return response.choices[0].message.content

    # Alternatively, use llama/ollama for local development (which incurs no cost)
    response = ollama.chat(model="llama3:8b", messages=messages)
    return response['message']['content']

def validate_auth_header(auth_header):
    """ Validate the token in the auth header using the public key from the JWKs endpoint
        Return either an error message, or null on success """

    # Make sure the header is in the format "Bearer <token>"
    if not auth_header:
        return "Authorization header is missing"

    split = auth_header.split()
    if len(split) != 2:
        return f"Invalid Authorization header format: '{auth_header}' (should be 'Bearer <token>')"
    token = split[1]

    try:
        # Decode without verification to inspect the token
        unverified_claims = jwt.decode(token, options={"verify_signature": False})

        if "iss" not in unverified_claims or unverified_claims["iss"] != ISSUER:
            print (f"Issuer mismatch: expected {ISSUER}")
            return "Issuer mismatch"
        if "aud" not in unverified_claims or unverified_claims["aud"] != AUDIENCE:
            print (f"Audience mismatch: expected {AUDIENCE}")
            return "Audience mismatch"
        if "scp" not in unverified_claims or unverified_claims["scp"] != SCOPE:
            print (f"Scope mismatch: expected {SCOPE}")
            return "Scope mismatch"

        header = get_unverified_header(token)
        if "alg" not in header:
            return "alg not found in header"
        alg = header['alg']

        if "exp" not in unverified_claims:
            return "exp not found in claims"
        if time() > unverified_claims["exp"]:
            return "Token has expired"

        if "email" not in unverified_claims or unverified_claims["email"] not in AUTH_ALLOWED_EMAILS:
            if "emails" not in unverified_claims or unverified_claims["emails"][0] not in AUTH_ALLOWED_EMAILS:
                return "Email not in allowed list"

        key = next(key for key in jwks['keys'] if key['kid'] == header['kid'])
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key).public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        decode(token, public_key, verify=True, algorithms=[alg], audience=AUDIENCE, issuer=ISSUER)
        return None
    except Exception as e: # pylint: disable=broad-except
        print (f"Error validating token: {e}")
        return str(e)

@app.route('/msal-signin', methods=['POST'])
def msal_signin():
    """ Validate the token and process the request """
    print ("msal-signin: Getting auth header")
    auth_header = request.headers.get('Authorization', None)
    err_message = validate_auth_header(auth_header)
    if not err_message:
        return "Success", 200
    return jsonify({"error": err_message}), 401


if __name__ == "__main__":
    if DEVELOPMENT:
        trace ("Starting development Flask server")
        app.run(debug=True)
    else:
        trace ("Starting production Flask server")
        serve(app, host="0.0.0.0", port=8080)
