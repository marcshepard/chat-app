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

Here's a quick overview of hosting and configuration
* The front-end is hosted as a "static web app" in my default Azure (company) tenant; details below.
* The web service is hosted as an "app service" in my default Azure tenant; details on the [backend github repo](https://github.com/marcshepard/chat-app-ws).
* The MSAL identity configuration is hosted in a separate B2C tenant created from my default tenant specifically for managing identities and access to the app. Details below.

## Details

### Background learning
Learning react: I went through these: https://react.dev/ and https://www.w3schools.com/react/.
Learning Flask: I already knew the basics.
Learning MSAL and Azure hosting for specific scenarion - see below.

### Steps for getting the Flask app running
This was pretty straight-forward and is discussed in the other repo. I recommend starting out with a stub auth header that requires an interactive secrete to be passed in, so it can be deployed securely while the front-end is being developed.

### Steps for getting front-end built and deployed
This wound up being insanely complicated and I had to start over and add the code bit by bit to get it working because I found Azure to be non-debuggable (nothing in the application or deployment logs suggested why the app wasn't working). Here are some notes on the steps I did on the redo, checking that deployment kept working at each step.

Step 1: Create a simple react app suitable for Azure hosting as a static web app per https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-react?pivots=github. Note: this should be hosted on your default (company) Azure tenant.

Step 2: Create a new Azure B2C tenant, and then add front-end signin (don't worry about the web service part for now), per https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-single-page-app-react-sign-in. Make sure this is done in a new B2C tenant (this will be important later, and the documentation for some reason doesn't tell you to do this, only to make sure to "swtich to the right tenant"). This involves:
* Within the B2C tenant
  * creating two app registrations (for the front-end and web service)
  * adding an API and scope to the web service
  * granting admin consent permissions
* Within the front end:
  * npm install @azure/msal-react @azure/msal-browser
  * Create msalConfig.js (to point to your B2C IDs) and MsalSignin.js (isolating the MSAL controls to one file)
  * Modify index.js to wrap the app in the MsalProvider
  * Modify App.js to call the signin button within the unautheticated template, and the signout button in the authenticated template
* Test locally, save to git, verify the Azure deployment.

Step 3: Added more code, including a call to the web service passing the auth token. I also added the app logo and name.

Step 4: Added user flows and oauth to the flow. XXX - I'm still stuck here as it's not working. In fact, the main sample in one of them has been pulled because it's known to not work.
1. The first step is adding a user flow for sign in and registration: https://learn.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-user-flows?pivots=b2c-user-flow
2. The second step is adding oauth "social network" providers so folks can user their Google/Apple/MSFT identities. https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-spa-app
3. I'm assuming there is a third step to configure who can access and how to upgrade their rights.
Right now I can build the user flows for 1 and 2, and they seem to run from Azure, but I can't figure out how to get them to work from my React app.

Getting close. Some things I've figured out:
1) To get user flow testing working E2E from Azure, make sure to specify both tokens should be returned, and enable the jwt.ms endpoint.
2) To get user flow working from react, there are a couple of important but undocumented configuration changes to msalConfig:
  * login scopes:   ["openid", "profile", "email"]  (could skip email if you don't need it)
  * auth/authority: https://<tenant-name>.b2clogin.com/<tenant-name>.onmicrosoft.com/<user-flow-name>/v2.0
  * auth/knownAuthorities: ["<tenant-name>.b2clogin.com"] - XXX; try removing this to check if it is necessary
3) On the web service, a discovery URL is needed to obtain the public key needed to verify token signature. It seems undocumented, but this works:
  * JWK_DISCOVERY_URL = f"https://{TENANT_NAME}.b2clogin.com/{TENANT_NAME}.onmicrosoft.com/{USER_FLOW}/discovery/v2.0/keys"
