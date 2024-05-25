/**
 * App.js: The main component for the chat app react front-end
 */

import React from 'react';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { SignInButton, SignOutButton } from "./MsalSignin";

const APP_NAME = "Chat App";
const LOGO = `${process.env.PUBLIC_URL}/logo.png`;

/**
 * SignInHeader: A header for the sign-in page, with app logo, name, and a sign-in button
 */
function SignInHeader({logo, appName}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <img src={logo} alt="logo" style={{ width: "1em", height: "1em"}} />
      <h1 style={{flex: 1, textAlign: "center"}}>{appName}</h1>
      <div style={{ display:"flex", justifyContent: "space-between", alignItems: "center"}}>
        <p><strong>Please sign in</strong></p>
        <div style={{ marginLeft: "10px" }}></div>
        <SignInButton />
      </div>
    </div>      
  );
}

/**
 * AppHeader: A header for the app, with app logo, name, and a sign-out button for the current user
 * 
 * @param {string} logo - The URL of the app logo
 * @param {string} appName - The name of the app
 * 
 * @returns {JSX.Element} The app header
 */
// Render the app header; a logo, the app name, and either current user + sign-out button, or sign-in option
function AppHeader({logo, appName}) {
  return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <img src={logo} alt="logo" style={{ width: "1.5em", height: "1.5em"}} />
        <h1 style={{flex: 1, textAlign: "center"}}>{appName}</h1>
        <div style={{ display: "flex", alignItems: "center"}}>
          <SignOutButton />
        </div>
      </div>
  );
}

function App() {
  return (
    <div>
        <AuthenticatedTemplate>
          <AppHeader logo={LOGO} appName={APP_NAME} />
        </AuthenticatedTemplate>

        <UnauthenticatedTemplate>
          <SignInHeader logo={LOGO} appName={APP_NAME} />
        </UnauthenticatedTemplate>
    </div>
  );
}

export default App;
