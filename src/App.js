import React from 'react';
import {AuthenticatedTemplate, UnauthenticatedTemplate} from "@azure/msal-react";
import { SignInButton, SignOutButton } from './MsalSignin';


function App() {
  return (
    <div>
        <p>Hello!</p>
        <AuthenticatedTemplate>
          <p>You are signed in</p>
          <SignOutButton />
        </AuthenticatedTemplate>

        <UnauthenticatedTemplate>
          <p>You are not signed in</p>
          <SignInButton />
        </UnauthenticatedTemplate>
    </div>
  );
}

export default App;
