/**
 * MsalSignin.js - basic MSAL signin/singout/gettoken functions
 * 
 * Docs: MSAL
 * https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-api-dotnet-register-app#expose-an-api
 */

import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { chatTokenScope, loginRequest } from "./msalConfig.js";
import React, { useState, useEffect } from "react";

/**
 * Renders a sign in button for user login with MSAL
 * 
 * @returns A button to sign the user in
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
 * @returns A button that signs the user out
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

function jwtDecode(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
}

/**
 * TokenInfo - Fetches a token and decodes it to display the user info, for debugging purposes
 * 
 * @returns A table with the decoded token info
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
