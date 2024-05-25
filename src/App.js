/**
 * App.js: The main component for the chat app react front-end
 */

import React from 'react';
import { useState } from 'react';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { SignInButton, SignOutButton } from "./MsalSignin";
import { NavigationBar, DropDownMenu } from "./Controls";

// Configuration variables
const APP_NAME = "Chat App";                          // Branding
const LOGO = `${process.env.PUBLIC_URL}/logo.png`;    // Branding

const CHATBOTS = [                                    // Chatbot configurations
  {
    "type": "Therapist",
    "name": "Dr. Feelgood",
    "personality": "professional, supportive, empathetic, skilled in active listening, CBT, and DBT",
    "description": "a configurable AI therapist",
    "context": "You are a therapist helping someone understand and address their psychological challenges",
    "greeting": "Hello! How can I help you today?",
    "summarizer_name": "Dr. Feelgood",
    "summarize_context": "You just finished a therapy session with a patient to help them understand and address their psychological challenges.",
    "summarize_prompt": "Hey doc, any parting thoughts you want to give me on our recent session or things I should work on before we meet again? Please be encouraging. Here's a reminder of our conversation:",
  },
  {
    "type": "Employee feedback",
    "name": "Alex",
    "personality": "confident, proud, defensive, eager to get ahead",
    "description": "a configurable employee chatbot you can use to practice giving employee feedback. Click summarize when done to see how you can get better at giving feedback.",
    "context": "You are an employee getting feedback from your manager",
    "greeting": "Hey, boss. What do you want to talk about?",
    "summarizer_name": "HR input",
    "summarize_context": "You are an HR manager providing feedback to a manager ('user') on their recent discussion with an employee ('assistant')",
    "summarize_prompt": "Provide me with feedback that includes an overall rating of my discussion (1-5), things I did well, and things I could have done better. Here is the text of over coversation:"
  },
];

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
  // App configuration info; available bots and nav buttons
  const botTypes = CHATBOTS.map((bot) => bot["type"]);
  const buttonNames = ["New", "Summarize", "Save", "Review", "Configure", ]
  const buttonDescriptions = ["Start a new chat", "End the current chat and get a summary",
  "Save the current chat", "Review saved chats", "Configure the chatbot's name and personality"]

  // App state; signed in user, current chatbot and session, and currently selected nav button
  const [chatBot, setChatBot] = useState(CHATBOTS[0]);
  const [session, setSession] = useState(0);   // Used to track new chat sessions, so chat control can reset the chatbot
  const [sessionIsActive, setSessionIsActive] = useState(true);  // Used to track if a chat session is active or not
  const [button, setButton] = useState(buttonNames[0]);
  
  function handleBotSelection(botType) {
    if (botType === chatBot["type"]) {
      return;
    }
    const newChatBot = CHATBOTS.find((bot) => bot["type"] === botType);
    setChatBot(newChatBot);
    setSession(session + 1);
    setSessionIsActive(true);
    setButton(buttonNames[0]);
  }

  function handleButtonClick(buttonName) {
    if (buttonName === "New") {
      setSession(session + 1);
      setSessionIsActive(true);
      setButton(buttonName);
      return;
    }
    if (buttonName === "Summarize") {
      setSessionIsActive(false);
      setButton(buttonName);
      return;
    }
    alert("Thread persistenace not yet implemented");
  }

  return (
    <div style={{ marginLeft: "10px", marginRight: "10px", minWidth: "390px" }}>
        <AuthenticatedTemplate>
          <AppHeader logo={LOGO} appName={APP_NAME} />
          <DropDownMenu name="Chat type" options={botTypes} handleSelect={handleBotSelection} />
          <br />
          <NavigationBar buttons={buttonNames} descriptions={buttonDescriptions} selectedButton={button} handleClick={handleButtonClick} />
          <p>Session is active: {sessionIsActive.toString()}</p>
        </AuthenticatedTemplate>

        <UnauthenticatedTemplate>
          <SignInHeader logo={LOGO} appName={APP_NAME} />
        </UnauthenticatedTemplate>
    </div>
  );
}

export default App;
