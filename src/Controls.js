/**
 * @file Controls.js
 * @description A few generic controls used by the React application.
 * @module Controls
 */

import React from 'react';

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
        <button key={index} onClick={() => handleClick(button)} title={descriptions[index]} style={{ width: width + "%", maxWidth: max_width }} className={selectedButton === button ? "Selected" : ""}>
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
