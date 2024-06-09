/**
 * App.js: The main component for the chat app react front-end
 */

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import { SignInButton, SignOutButton, useAuthToken, AuthProviderAppWrapper, Authenticated, Unauthenticated } from "./MsalSignin";
import './App.css';

// Configuration variables
const APP_NAME = "Chat App";                          // Branding
const LOGO = `${process.env.PUBLIC_URL}/logo.png`;    // Branding

const API_URL = process.env.REACT_APP_API_URL;
const CHAT_URL = `${API_URL}/chat`;
console.log("API_URL: ", API_URL);

// The chatbots available in the app
const CHATBOTS = [                                    // Chatbot configurations
  {
    "type": "Therapist",
    "name": "Dr. Feelgood",
    "personality": "professional, supportive, empathetic, skilled in active listening, CBT, and DBT",
    "description": "an AI therapist",
    "context": "You are a therapist helping someone understand and address their psychological challenges",
    "greeting": "Hello. What's on your mind?",
  },
  {
    "type": "Translator",
    "name": "Alex",
    "personality": "expert at translating to whatever language the user specified in their initial message",
    "description": "a translator",
    "context": "You always start by asking them for a target language. You next confirm their language by saying 'type anything and I'll translate it to <language>' (you must say this in English, regardless of what language they want you to translate to later). After that, you just translate the last thing they said to that language.",
    "greeting": "What language shall I translate to?",
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
    <div className="header">
      <img src={logo} alt="logo" className="logo" />
      <h1>{appName}</h1>
      <SignInButton />
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
function AppHeader({logo, appName}) {
  return (
      <div className="header">
        <img src={logo} alt="logo" className="logo" />
        <h1>{appName}</h1>
        <SignOutButton />
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
 * TextInput - Get text input from the user via text box + button.
 *
 * @param {Function} handleInput - Callback function to handle the input text.
 * @param {string} placeholder - The placeholder text for the input box.
 * @param {string} buttonText - The text to display on the button.
 * @param {boolean} [disabled=false] - Whether the input box and button should be disabled.
 *
 * @returns {JSX.Element} The rendered React component for text input.
 */
export function TextInput({ handleInput, placeholder, buttonText, disabled = false }) {
  const [text, setText] = useState("");

  function handleClick() {
    handleInput(text);
    setText("");
  }

  return (
    <div className="input-bar">
      <input
        className = "input-text"
        disabled={disabled}
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleClick() }}
      />
      <button disabled={disabled} onClick={handleClick}>{buttonText}</button>
    </div>
  );
}

/**
 * ScrollableTextBox - A scrollable text box, scrolled to the end.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.text - The text to display in the scrollable text box.
 *
 * @returns {JSX.Element} The rendered React component for scrollable text box.
 */
export function ScrollableTextBox({ text }) {
  return (
    <div className="scrollable-textbox">
      {text}
      <div ref={(el) => { el && el.scrollIntoView({ behavior: "smooth" }); }}></div>
    </div>
  );
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
  const aquireAuthToken = useAuthToken();   // Get a function to squire the authentication token
  const awaitingResponse = useRef(false);   // Flag to track if a response from the server is pending

  console.log("In chat with ", chatBot["name"], ", session " + session, ", isActive=", sessionIsActive);

  // Reset state when a new session is started or a new chatbot is selected
  useEffect(() => {
    console.log("Starting new session: ", session)
    setMessages ([
      {"role": "system", "content": chatBot["context"] + ". Your name is " + chatBot["name"] + " and your personality is " + chatBot["personality"] + "."},
      {"role": "assistant", "content": chatBot["greeting"]},
    ]);
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
      <TextInput handleInput={handleUserInput} placeholder="Type your message here" buttonText="Send" disabled={!sessionIsActive}/>
    </div>
  );
}

function HelpModal({isOpen, onClose}) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Help Modal"
      className = "help"
    >
      <button className="help-close" onClick={onClose}>x</button>
      <div>
        <h2 align="Center">About the chat app</h2>
        <p>This chat app allows you to interact with different chatbots, powered by OpenAI.
          A brief description of the selected chatbot is displayed at the top of the chat window.
          You interact with it by typing messages in the text box at the bottom of the chat window and waiting for a response.
          You can change chatbots from dropdown menu or click new to start a new chat session.</p>
        <p>Chat app version: 0.5</p>
      </div>
    </Modal>
  );
}

/**
 * App: The main component for the chat app react front-end
 * 
 * @returns {JSX.Element} The rendered React component for the chat app
 */
function ChatApp() {
  // App state; signed in user, current chatbot and session, and currently selected nav button
  const [chatBot, setChatBot] = useState(CHATBOTS[0]);
  const [session, setSession] = useState(0);   // Used to track new chat sessions, so chat control can reset the chatbot
  const [sessionIsActive, setSessionIsActive] = useState(true);  // Used to track if a chat session is active or not
  const [helpModalIsOpen, setHelpModalIsOpen] = useState(false);
  
  // Start a new chat session
  function startNewSession() {
    setSession(session + 1);
    setSessionIsActive(true);
  }

  // Change chatbots
  function handleBotSelection(botType) {
    console.log("Changing chatbot to ", botType);
    const newChatBot = CHATBOTS.find((bot) => bot["type"] === botType);
    console.log("New chatbot: ", newChatBot);
    setChatBot(newChatBot);
    startNewSession();
  }

  return (
    <div className="app">
        <Authenticated>
          <AppHeader logo={LOGO} appName={APP_NAME} />
          <div className="header">
            <select title="Select a chatbot" value={chatBot.type} onChange={event => handleBotSelection(event.target.value)}>
              {CHATBOTS.map((bot) => <option key={bot.type} value={bot.type}>{bot.name}</option>)}
            </select>
            <button title="Start a new chat" onClick={startNewSession}>New chat</button>
            <button title="Learn about the wordle analyzer" onClick={() => setHelpModalIsOpen(true)}>Help</button>
          </div>
          <br />
          <Chat chatBot={chatBot} session={session} sessionIsActive={sessionIsActive}/>
          <HelpModal isOpen={helpModalIsOpen} onClose={() => setHelpModalIsOpen(false)} />
        </Authenticated>

        <Unauthenticated>
          <SignInHeader logo={LOGO} appName={APP_NAME} />
        </Unauthenticated>
    </div>
  );
}

/**
 * A simple wrapper for the chat app that provides the authentication context
 * 
 * @returns {JSX.Element} The rendered React component for the chat app
 */
function App() {
  return (
    <AuthProviderAppWrapper>
      <ChatApp />
    </AuthProviderAppWrapper>
  );
}

export default App;
