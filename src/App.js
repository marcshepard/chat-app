/**
 * App.js: The main component for the chat app react front-end
 */

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { SignInButton, SignOutButton, useAuthToken } from "./MsalSignin";
import { ScrollableTextBox, TextInput, NavigationBar, DropDownMenu } from "./Controls";

// Configuration variables
const APP_NAME = "Chat App";                          // Branding
const LOGO = `${process.env.PUBLIC_URL}/logo.png`;    // Branding
//const BASE_URL = "http://localhost:5000"
const BASE_URL = "https://chat-ws.azurewebsites.net/";
const CHAT_URL = BASE_URL + "/chat";

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
 * 
 * @param {string} logo - The URL of the app logo
 * @param {string} appName - The name of the app
 * 
 * @returns {JSX.Element} The app header
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

/**
  * getChatResponse - Send a set of chat messages to the server and return the response
  *
  * @param {Object[]} messages - The array of messages to send to the server
  * @param {number} forSession - The session number for which the messages are being sent
  * @param {authToken} authToken - The authentication token for the user
  * 
  * @returns {Promise} that resolves to the tuple [server response, forSession]
  */
async function getChatResponse(messages, forSession, authToken) {
  console.log("getChatResponse sending messages to server: ", messages);

  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
          "Authorization": "Bearer " + authToken,
          "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    })
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error("HTTP error " + response.status + " " + responseText);
    }
    return [responseText, forSession];
  } catch (error) {
    console.error("Error:", error.messages);
    return ["Sorry, but I'm having some issues right now (" + error.message + ")", forSession];
  }
}

/**
 * ScrollableChat - A scrollable text box showing the user and bot messages
 * @param {Object[]} chatData - the (role, content) array of messages to display
 * @param {string} userName - the name to use for the user role
 * @param {string} botName - the name to use for the bot role
 * 
 * @returns {JSX.Element} The rendered React component for the scrollable chat, scrolled to the end
 */
function ScrollableChat({chatData, userName, botName}) {
  // Function to format an array of (name, text)
  const formatChatData = (chatData) => {
    return chatData.map((dict, index) => (
      <div key={index}>
        <p><strong>{dict["role"] === "user" ? userName : botName}</strong>: {dict["content"]}</p>
      </div>
    ));
  };

  var formatedChatData = formatChatData(chatData.slice(1)); // Skip the system message
  if (chatData.length === 3) {
    formatedChatData = [...formatedChatData, <p key={chatData.length}>Waiting for initial reply. Be patient as it is hosted on the Azure free tier which may take 30 seconds to start up for the initial response.</p>]
  }

  return (
    <ScrollableTextBox text={formatedChatData} />
  );
}

/**
  * Chat - the main control consisting of a scrollable list of messages and a text input box
  * 
  * @param {dict} chatBot - the configuration of the currently selected chatbot
  * @param {number} session - the current session number; chat is reset when this number changes (or chatbot changes)
  * @param {boolean} sessionIsActive - flag to indicate if the chat session is active; used to trigger a summary on session end
  * 
  * @returns {JSX.Element} The rendered React component for the chat control
  */
function Chat({chatBot, session, sessionIsActive}) {
  // State that is reset whenever a new session is started
  const [messages, setMessages] = useState([]);
  const summarized = useRef(false);
  const aquireAuthToken = useAuthToken();   // Get a function to squire the authentication token
  const awaitingResponse = useRef(false);   // Flag to track if a response from the server is pending

  console.log("In chat with ", chatBot["name"], ", session " + session, ", isActive=", sessionIsActive, "summarized=", summarized.current);

  // Reset state when a new session is started or a new chatbot is selected
  useEffect(() => {
    console.log("Starting new session: ", session)
    setMessages ([
      {"role": "system", "content": chatBot["context"] + ". Your name is " + chatBot["name"] + " and your personality is " + chatBot["personality"] + "."},
      {"role": "assistant", "content": chatBot["greeting"]},
    ]);
    summarized.current = false;
    awaitingResponse.current = false;
  }, [session, chatBot]);

  // When awaitingResponse is set to true, get an asynchronous response from the server and append it to the messages
  useEffect(() => {
    console.log("Awaiting response: ", awaitingResponse.current);
    if (!awaitingResponse.current) {
      console.log("Not awaiting response after all...");
      return;
    }

    async function getResponse() {
      console.log("Getting authToken for session ", session);
      const authToken = await aquireAuthToken();
      console.log("Calling server");
      const [response, forSession] = await getChatResponse(messages, session, authToken);
      awaitingResponse.current = false;
      if (session !== forSession) {
        console.log("Ignoring response for old session ", forSession);
        return;
      }
      console.log("Got response: ", response);
      setMessages(messages => [...messages, {"role": "assistant", "content" : response}]);
    }

    getResponse();
  }, [aquireAuthToken, awaitingResponse, messages, session]);

  // When the session ends, get an asynchronous summary from the server
  useEffect(() => {
    // Nothing to do if already summarized or the session is still active
    if (sessionIsActive || summarized.current)
      return;
    
    console.log("Summarizing chat");
    summarized.current = true;

    // Get a text version of the current chat
    const chatText = messages.map((dict) => {
      if (dict["role"] === "system") {
        return "";
      } else {
        return dict["role"] + ": " + dict["content"] + "\n";
      }
    }).join("\n");
    console.log("Chat text: ", chatText);
    
    // Ask the chatbot to summarize it
    const summaryMessages = [
      {"role": "system", "content": chatBot["summarize_context"]},
      {"role": "user", "content": chatBot["summarize_prompt"] + "\n" + chatText},
    ];

    aquireAuthToken().then((authToken) => {
      getChatResponse(summaryMessages, session, authToken).then((response) => {
      setMessages(messages => [...messages, {"role": "assistant", "content" : response[0]}]);
      });
    });
  }, [sessionIsActive, summarized, messages, session, chatBot, aquireAuthToken]);

  // When the user types something, append it to the messages and await a response
  function handleUserInput(text) {
    // Append the users input to the messages
    setMessages(messages => [...messages, {"role": "user", "content" : text}])

    // Call getChatResponse asynchronously with the updated set of messages
    awaitingResponse.current = true;
  }

  return (
    <div>
      <p><b>{chatBot["name"]}</b> is {chatBot["description"]}.</p>
      <ScrollableChat chatData={messages} userName="You" botName={chatBot["name"]} />
      <TextInput handleInput={handleUserInput} placeholder="Type your message here" buttonText="Send" fullwidth={true} disabled={!sessionIsActive}/>
    </div>
  );
}

/**
 * App: The main component for the chat app react front-end
 * 
 * @returns {JSX.Element} The rendered React component for the chat app
 */
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
          <Chat chatBot={chatBot} session={session} sessionIsActive={sessionIsActive}/>
        </AuthenticatedTemplate>

        <UnauthenticatedTemplate>
          <SignInHeader logo={LOGO} appName={APP_NAME} />
        </UnauthenticatedTemplate>
    </div>
  );
}

export default App;
