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
        instance.loginPopup(loginRequest).catch(e => {  // Alternatively, use loginRedirect
            console.log(e);
        });
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

    const acquireToken = async (scopes) => {
        const request = {
            scopes: scopes,
            account: accounts[0],
        };

        try {
            const response = await instance.acquireTokenSilent(request);
            return response.accessToken;
        } catch (e) {
            if (e instanceof InteractionRequiredAuthError) {
                // Fallback to interactive if silent acquisition fails
                const response = await instance.acquireTokenPopup(request);
                return response.accessToken;
            } else {
                throw e;
            }
        }
    };

    return acquireToken;
};

