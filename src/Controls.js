/**
 * @file Controls.js
 * @description A few generic controls used by the React application.
 * @module Controls
 */

import React from 'react';
import { useState } from 'react';

/**
 * TextInput - Get text input from the user via text box + button.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {Function} props.handleInput - Callback function to handle the input text.
 * @param {string} props.placeholder - The placeholder text for the input box.
 * @param {string} props.buttonText - The text to display on the button.
 * @param {boolean} [props.fullwidth=false] - Whether the input box should take full width.
 * @param {boolean} [props.disabled=false] - Whether the input box and button should be disabled.
 *
 * @returns {JSX.Element} The rendered React component for text input.
 */
export function TextInput({ handleInput, placeholder, buttonText, fullwidth = false, disabled = false }) {
  const [text, setText] = useState("");

  function handleClick() {
    handleInput(text);
    setText("");
  }

  return (
    <div style={{ display: "flex", width: fullwidth ? "100%" : undefined }}>
      <input
        disabled={disabled}
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleClick() }}
        style={{ flex: fullwidth ? "1" : undefined, fontSize: "1.25em" }}
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
    <div style={{ height: "60vh", overflowY: "scroll", border: "1px solid black", padding: "10px" }}>
      {text}
      <div ref={(el) => { el && el.scrollIntoView({ behavior: "smooth" }); }}></div>
    </div>
  );
}

/**
 * NavigationBar - A horizontal set of navigation buttons with descriptions to be shown on hover.
 * By default, the first button is selected/disabled.
 * Clicking a button selects it and calls the handleClick function with the button name.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {string[]} props.buttons - The array of button names.
 * @param {string[]} props.descriptions - The array of descriptions for the buttons.
 * @param {string} props.selectedButton - The currently selected button.
 * @param {Function} props.handleClick - Callback function to handle button click.
 * @param {string} [props.max_width="90px"] - The maximum width of each button.
 *
 * @returns {JSX.Element} The rendered React component for navigation bar.
 */
export function NavigationBar({ buttons, descriptions, selectedButton, handleClick, max_width = "90px" }) {
  const width = (100 / (buttons.length + .5)) >> 0;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      {buttons.map((button, index) => (
        <button key={index} onClick={() => handleClick(button)} title={descriptions[index]}
              style={{ width: width + "%", maxWidth: max_width, backgroundColor: selectedButton === button ? "#f5f5f5" : undefined }} >
          {button}
        </button>
      ))}
    </div>
  );
}

/**
 * DropDownMenu - A lable + drop-down menu with options; the selected option is shown when the menu is closed.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.name - The name of the drop-down menu.
 * @param {string[]} props.options - The array of options for the drop-down menu.
 * @param {Function} props.handleSelect - Callback function to handle option selection.
 *
 * @returns {JSX.Element} The rendered React component for drop-down menu.
 */
export function DropDownMenu({ name, options, handleSelect }) {
  return (
    <div>
      <label>{name}: </label>
      <select onChange={(event) => handleSelect(event.target.value)}>
        {options.map((option, index) => (
          <option key={index} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
