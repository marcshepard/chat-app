This is a Flask implementation of a chatbot web service, hosted on Azure. The front-end code is at https://github.com/marcshepard/chat-app.

It has just one method: Chat - allows for chat completion
It uses MSAL for authentication; this is coupled with the front-end and a fair bit of the documentation is there.

Development notes:
[Flask](https://flask.palletsprojects.com/en/3.0.x/quickstart/)
[Azure Deployment](https://learn.microsoft.com/en-us/azure/app-service/quickstart-python)
[CORS](https://pypi.org/project/Flask-Cors)
MSAL - We need to validate the JWT auth token that the react front-end has obtained from Azure. This was a PITA since it's not documented. Most of the pain was in front-end obtaining the token, which is documented on the front-ends README. The hardest part here was finding the right (undocumented) JWK discovery URL to use here to get the public key to use for auth-token signature validation. It turns out this is what you need: JWK_DISCOVERY_URL = f"https://{TENANT_NAME}.b2clogin.com/{TENANT_NAME}.onmicrosoft.com/{USER_FLOW_NAME}/discovery/v2.0/keys"


Environment variables and/or code constants:
| TENANT_ID | Azure B2C tenant managing identities|
| CLIENT_ID | App registration ID in Encarta |
| CLIENT_ID_URI | URI format of the ID in Encarta |
| SCOPE | Name of the scope in Encarta for access to the API |
| DEVELOPMENT | Configures which Flask server to start |
| CORS_ORIGINS | Front-end URLS (initially including localhost during development) |

