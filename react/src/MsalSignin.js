/**
 * MsalSignin.js - All the MSAL stuff abstracted into a single file.
 * 
 * Configuration: Must define process.env.REACT_APP_:
 * - CLIENT_ID          The application (client) ID
 * - AUTHORITY          For the B2C tenant, it's https://<tenantname>.b2clogin.com/<tenantname>.onmicrosoft.com/<workflowname>/v2.0
 * - KNOWN_AUTHORITIES  Comma separated list of known authorities. For B2C tenant, use <tenantname>.b2clogin.com
 * - LOGIN_SCOPES       A comma separated list of scopes requested during sign-in for the ID token
 * - API_SCOPES         A comma separate list of scopes to request for the access token
 * 
 * Usage: Wrap your main app in AuthProviderAppWrapper.
 * Wrap you "logged out" state code in Unauthenticated, and your "logged in" state code in Authenticated.
 * Use SignInButton and SignOutButton for sign-in/sign-out
 * Use useAuthToken to get an acess token for API requests, to construct the bearer token header
 * Use TokenInfo to display the decoded token for debugging
 * 
 * These are used per MSAL docs: https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-api-dotnet-register-app#expose-an-api
 */

import { useMsal, MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { InteractionRequiredAuthError, LogLevel, PublicClientApplication } from "@azure/msal-browser";
import React, { useState, useEffect } from "react";

/**
 * Configuration object to be passed to MSAL instance on creation. 
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md 
 */

const msalConfig = {
    auth: {
        clientId: process.env.REACT_APP_CLIENT_ID,
        authority: process.env.REACT_APP_AUTHORITY,
        knownAuthorities: process.env.REACT_APP_KNOWN_AUTHORITIES.split(','),
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {	
        loggerOptions: {	
            loggerCallback: (level, message, containsPii) => {	
                if (containsPii) {		
                    return;		
                }		
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                    default:
                        return;
                }	
            }	
        }	
    }
};
const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
const loginRequest = {
    scopes: process.env.REACT_APP_LOGIN_SCOPES.split(','),
    prompt: "select_account"
};

/*
 * Scopes needed for the chat web service
 */
const chatTokenScope = process.env.REACT_APP_API_SCOPES.split(',');


/**
 * Renders a sign in button for user login with MSAL
 * 
 * @returns {JSX} A button to sign the user in
 */
export const SignInButton = () => {
    const { instance } = useMsal();

    function handleSignIn() {
        instance.loginPopup(loginRequest)
            .then(response => console.log("Login response: ", response))
            .catch(e => console.log(e));
    }
    return (
        <button onClick={handleSignIn}>Sign In</button>
    )
}

/**
 * Renders a sign-out button next to the signed in users name
 * 
 * @returns {JSX} A button that signs the user out
 */
export const SignOutButton = () => {
    const { instance, accounts } = useMsal();
    const [ user, setUser ] = useState("Unknown user");

    useEffect(() => {
        if (accounts.length > 0) {
            instance.acquireTokenSilent({
                scopes: chatTokenScope,
                //...loginRequest,
                account: accounts[0]
            }).then(response => {
                setUser(response.account.name);
                console.log (user);
            }).catch(e => {
                console.log(e);
            });
        }
    }, [accounts, instance, user]);

    function handleSelect(event) {
        const option = event.target.value;
        console.log("In handleSelect with option: ", option);
        if (option === "Sign out") {
            instance.logoutPopup().catch(e => {             // Alternatively, use logoutRedirect
            console.error(e);
            });
        } else {
            console.log("Selected option: ", option);
        }
    }

    return (
        <div>
            <select value={user} onChange={handleSelect}>
                <option disabled>{user}</option>
                <option>Sign out</option>
            </select>
        </div>
    );
}

/**
 * Custom hook to acquire an access token silently, or pop up an interactive login if required
 * 
 * @returns A asynch function to acquire an access token for a given set of scopes (passed as an argument)
 */
export const useAuthToken = () => {
    const { instance, accounts } = useMsal();

    const acquireToken = async () => {
        const request = {
            scopes: chatTokenScope,
            account: accounts[0],
        };

        try {
            console.log("In useAuthToken, attempting to aquire an auth token silently");
            const response = await instance.acquireTokenSilent(request);
            console.log("Silently aquired authToken");
            return response.accessToken;
        } catch (e) {
            if (e instanceof InteractionRequiredAuthError) {
                // Fallback to interactive if silent acquisition fails
                console.log("In useAuthToken, using popup to acquire an auth token");
                const response = await instance.acquireTokenPopup(request);
                console.log("Popup aquired the token succesfully");
                return response.accessToken;
            } else {
                console.log("useAuthToken failed with error", e);
                throw e;
            }
        }
    };

    return acquireToken;
};

/**
 * Decode a jwt token
 * @param {string} token a base64Url encoded ID or access token 
 * @returns {Object} the decoded token as a JavaScript object
 */
function jwtDecode(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
}

/**
 * TokenInfo - Fetches a token and decodes it to display the user info, for debugging purposes
 * 
 * @returns {JSX} a table with two columns (Key, Value) that displays what is in the ID or access token
 */

export const TokenInfo = () => {
    const { accounts, instance } = useMsal();
    const [ user, setUser ] = useState({username: "Unknown user", token: null});

    useEffect(() => {
        if (accounts.length > 0) {
            instance.acquireTokenSilent({
                scopes: chatTokenScope,
                account: accounts[0]
            }).then(response => {
                // Update the user state only if the user has changed to avoid infinite re-renders
                if (response.account.name !== user.username || response.accessToken !== user.token) {
                    setUser({"username": response.account.name, "token": response.accessToken});
                }
                console.log (user);
            }).catch(e => {
                console.log(e);
            });
        }
    }, [accounts, instance, user]);

    if (user.token === null) {
        return <div>Loading...</div>;
    }

    const token = jwtDecode(user.token);
    return (
        <div>
            <p>User: {user.username}</p>
            <table>
                <thead>
                    <tr>
                        <th style={{textAlign: "left"}}>Key</th>
                        <th style={{textAlign: "left"}}>Value</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(token).map(([key, value]) => (
                        <tr key={key}>
                            <td>{key}</td>
                            <td>{JSON.stringify(value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Wrap the main app in this provider to enable MSAL authentication
 */

export function AuthProviderAppWrapper ({children}) {
    return (
        <MsalProvider instance={msalInstance}>
            {children}
        </MsalProvider>
    );
}

/**
 * Use this component to wrap code that should only run when the user is authenticated
 */
export function Authenticated ({children}) {
    return (
        <AuthenticatedTemplate>
            {children}
        </AuthenticatedTemplate>
    )
}

/**
 * Use this component to wrap code that should only run when the user is unauthenticated
 */
export function Unauthenticated ({children}) {
    return (
        <UnauthenticatedTemplate>
            {children}
        </UnauthenticatedTemplate>
    )
}
