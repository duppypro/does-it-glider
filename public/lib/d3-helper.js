////////////////////////////////////////////////////////////////////////////////
//
// d3-helper.js
// (c) 2023, David 'Duppy' Proctor, Interface Arts
//
// d3-helper.js contains helper functions for d3
//
////////////////////////////////////////////////////////////////////////////////

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export { d3 };

export const d3_plus = (() => {
    d3.selection.prototype.emmet = function (selector, where) {
        var match = selector.match(/^(\w+)(?:#([\w-]+))?(?:\.([\w-.]+))?$/);
        if (!match) {
            this.insert(selector, where);
            // throw new Error('Invalid selector')
        }

        var tag = match[1];
        var id = match[2];
        var classes = match[3];

        var selection = this.insert(tag, where);

        if (id && id.trim()) {
            selection.attr('id', id);
        }

        if (classes && classes.trim()) {
            // Split classes by '.' and join with spaces
            selection.attr('class', classes.split('.').join(' '));
        }

        return selection;
    };
    // add a function called emmet to d3 selection that parses an emmet abbreviation string and calls d3.selection.append() or insert() as appropriate
    // Here is the syntax for emmet abbreviations:
    /*
    Abbreviations Syntax
    Emmet uses syntax similar to CSS selectors for describing elements’ positions inside generated tree and elements’ attributes.
    ...
    */
    d3.selection.prototype.emmetBETA = function (selector, where) {
        // Split the selector into individual parts
        const parts = selector.split(/(?=[>+^])/);

        // Initialize the current selection as the current d3 selection
        let currentSelection = this;

        // Loop through each part of the selector
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();

            // Check if the part is a child operator
            if (part === '>') {
                // Move to the next child level
                currentSelection = currentSelection.append('div');
            }

            // Check if the part is a sibling operator
            else if (part === '+') {
                // Move to the next sibling level
                currentSelection = currentSelection.insert('div', where);
            }

            // Check if the part is a climb-up operator
            else if (part === '^') {
                // Move to the parent level
                currentSelection = currentSelection.node().parentNode;
            }

            // Check if the part is a multiplication operator
            else if (part.includes('*')) {
                // Split the part into element and count
                const [element, count] = part.split('*');

                // Get the number of repetitions
                const repetitions = parseInt(count, 10);

                // Repeat the element
                for (let j = 0; j < repetitions; j++) {
                    currentSelection = currentSelection.append(element);
                }
            }

            // Check if the part is a group
            else if (part.includes('(') && part.includes(')')) {
                // Extract the group content
                const groupContent = part.substring(part.indexOf('(') + 1, part.lastIndexOf(')'));

                // Parse the group content recursively
                const groupSelection = d3.select(document.createElement('div')).emmet(groupContent);

                // Append the group selection to the current selection
                currentSelection = currentSelection.append(() => groupSelection.node().childNodes);
            }

            // Check if the part is an element with attributes
            else if (part.includes('#') || part.includes('.')) {
                // Split the part into element and attributes
                const [element, attributes] = part.split(/(?=[.#])/);

                // Extract the element name
                const elementName = element.trim();

                // Create the element with the specified attributes
                const elementSelection = currentSelection.append(elementName);

                // Parse and apply the attributes
                attributes.split('.').forEach((attr) => {
                    if (attr.startsWith('#')) {
                        // Set the id attribute
                        const id = attr.substring(1);
                        elementSelection.attr('id', id);
                    } else {
                        // Set the class attribute
                        const className = attr.trim();
                        elementSelection.classed(className, true);
                    }
                });

                // Update the current selection
                currentSelection = elementSelection;
            }

            // Check if the part is a text element
            else if (part.startsWith('{') && part.endsWith('}')) {
                // Extract the text content
                const textContent = part.substring(1, part.length - 1);

                // Append the text content to the current selection
                currentSelection.append('text').text(textContent);
            }

            // Check if the part is a numbered element
            else if (part.includes('$')) {
                // Split the part into element and number
                const [element, number] = part.split('$');

                // Get the current number
                const currentNumber = i + 1;

                // Replace the number placeholder with the current number
                const elementName = element.replace('$', currentNumber);

                // Create the numbered element
                const elementSelection = currentSelection.append(elementName);

                // Update the current selection
                currentSelection = elementSelection;
            }

            // Check if the part is a custom attribute
            else if (part.includes('[') && part.includes(']')) {
                // Extract the attribute content
                const attributeContent = part.substring(part.indexOf('[') + 1, part.lastIndexOf(']'));

                // Split the attribute content into individual attributes
                const attributes = attributeContent.split(',');

                // Loop through each attribute
                attributes.forEach((attribute) => {
                    // Split the attribute into name and value
                    const [name, value] = attribute.split('=');

                    // Remove any surrounding quotes from the value
                    const trimmedValue = value ? value.replace(/['"]/g, '') : '';

                    // Set the attribute on the current selection
                    currentSelection.attr(name.trim(), trimmedValue);
                });
            }
        }

        return currentSelection;
    };

    return d3
})() // end of add helpers to d3