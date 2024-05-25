# Overview
This is the front end of a simple chat app I built so I could understand how to do full stack development using React (front-end), Flask (web service), and Azure (hosting). It is powered by ChatGPT.


# Development
I want to document the development and deployment steps so I can reproduce this on future projects, as I found the documentation a bit tricky to follow and there was so much trial and error involved, due to my inexperience.

Building and deploying the Flask web service was a peice of cake. Getting the react app deployed on Azure was painful, as was getting MSAL integration working.

## Overview
Here is a quick overview of the development choices:
* React front end - It's the most popular framework for front-end development by far, so a natual choice.
* Flask web service - I'm a Python programmer, and Flask is the most popular web service framework.
* MSAL auth - The web service uses OPENAI API keys that require protection, so some form of authentication and authorization is needed. I started with simple name/pw, then moved to google oauth so folks don't have to have additional passwords, then finally settled on MSAL since it takes care of providing multiple oauth providers in addition to smoothly handling token refreshes to ensure a good user experience. I picked MSAL since it seems solid and as an ex-MSFTie I'm biased towards using their tech.
* Azure hosting - As solid alternative to AWS and as an ex-MSFTie I'm biased towards using their tech.

Here's a quick overview of the way this is structured:
* The front-end and web service are hosted in my default Azure (company) tenant; details below.
* For details on the [backend github repo](https://github.com/marcshepard/chat-app-ws).
* The MSAL identity configuration is hosted in a separate B2C tenant created from my default tenant specifically for managing identities and access to the app. The idea is to default to a B2C tenant per app.
  * There is a separate 

## Details

### Prereqs
Learning react: I went through these: https://react.dev/ and https://www.w3schools.com/react/.
Learning Flask: I already knew the basics.
Learning MSAL and Azure hosting for specific scenarion - see below.

### Steps for getting the Flask app running
This was pretty straight-forward and is discussed in the other repo. I recommend starting out with a stub auth header that requires an interactive secrete to be passed in, so it can be deployed securely while the front-end is being developed.

### Steps for getting front-end built and deployed
Note: I wasted at least a week trying to get Azure deployment to work. I finally gave up and started over, putting
the code in bit by bit to make sure deployment kept working at each step since I was unable to figure it out
in the larger code base. Below are the incremental steps.

Step 1: Create a react stub app in github and deploy it to Azure as a static web app per https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-react?pivots=github. Note: this should be hosted on your default (company) Azure tenant.

Step 2: Create a new Azure B2C tenant, and then add front-end signin (don't worry about the web service part for now), per https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-single-page-app-react-sign-in. Make sure this is done in a new B2C tenant (this will be important later, and the documentation for some reason doesn't tell you to do this, only to make sure to "swtich to the right tenant"). This involves:
* Some B2C tenant configuration
* npm install @azure/msal-react @azure/msal-browser
* Create msalConfig.js (to point to your B2C IDs) and MsalSignin.js (isolating the MSAL controls to one file)
* Modify index.js to wrap the app in the MsalProvider
* Modify App.js to call the signin button within the unautheticated template, and the signout button in the authenticated template
* Test locally, save to git, verify the Azure deployment.

Step 3: Added more code, including a call to the web service passing the auth token. I also added the app logo and name.





















Step 2: Create a Flask stub app in github and deploy it to Azure. For details, see [the web service project README](https://github.com/marcshepard/chat-app-ws) 

Step 3: Add your actual react code and flask code and get them working on localhost.
1. Leave auth out for now as that adds more complication. But you need some temporary auth since the web service is public. I had the front-end user enter a name/pw pair, sent them to the web service in an Auth Header "Basic {name, pw}", had the server use an environment variable that contained "name/hashed pw", and checked each call.
2. CORS-enable the web service: https://pypi.org/project/Flask-Cors/.
3. Consider the following environment variables:
  * DEVELOPMENT - if you are in development or production.
  * FRONTEND_URL - used by web service for CORS configuration
  * BACKEND_USL - used by front-end to know which back-end to talk to
  * AUTH - used by web service to see what auth headers to accept; initially a list of [name, pwhash]

Step 4: Deploy both. This should happen automatically when you check-in you code assuming you have set both projects up to auto-deploy on git changes per the steps.
* Set the appropriate environment variable in Azure for each app
* Look at the deployment logs and then the app logs for each service to help troubleshoot issues

### Steps for adding MSAL

Two app registrations; one for the front-end and one for the web service.
* Both use all identity providers as supported account types, which is the default (but different than the MSFT docs)
* Both use SPA redirect URI; leave blank for now. Later you will put all possible values (which includes localhost during development)
* For the web service app registration, expose an API. Remember it's URI and scope name.
https://chatapp123b2c.onmicrosoft.com/aa189e99-139b-4c10-a124-d04c23138633/Chat.chat
* For the web service app, go to API permissions and add it as a permission. XXX - currently have this listed as admin concent required.
* Note the API GUID as well as the scope name; these need to be configured in Flask later

Modify msalConfig.js like so:
*  so that redirectUri = window.location.origin (and not "localhost..."!) so it will work for both development and production

TODO - fold these in:
1. Create an Entra app registration for the front-end (this app)
2. Create an Entra app registration for the web service (the chat web service this app talks to)
   * Then expose an API in the web service registration. I called it Chat.chat (first add a scope which gives it a URI, the save, then name it and configure for admins & users).
3. In the client app:
  * Install the msal-browser and msal-react packages
  * msalConfig.js - contains configuration settings; where to store auth tokens, login scopes for id token, auth scopes for auth token
  * msalSignin.js - signin and signout controls, a tokeninfo control for debugging, and a method to get the token for web service calls
  * index.js - add MSAL provider wrapper
  * App.js - use AuthenticatedTemplate and UnauthenticatedTemplate controls to if we should render the signin page or the app page
4. In the web service, make sure to validate the auth token. More details of that are in that projected github readme

Note: For deployment, the redirection URIs in msalConfig and Entra much match:
* In Entra, go to app registration/authentication/SPA redirection and add where the front end is hosted (as well as perhaps localhost:3000 for development).
* In msalConfig.js, replace the default value of redirectUri: to be window.location.origin (the value of "http://localhost/3000" that MSFT provides in their template only works for local development, while window.location.origin will work for all SPA's regardless of where deployed)

https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-single-page-app-react-sign-in

Create a user flow: https://learn.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-user-flows?pivots=b2c-user-flow

https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-spa-app
