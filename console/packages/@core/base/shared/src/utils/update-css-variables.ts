/**
 * Function to update CSS variables dynamically
 * @param variables Map of CSS variables to their new values
 * @param id ID for inline stylesheet for reuse and overrides
 * @param selector Selector where variables are attached, default `:root`.
 * For component libraries defining variables under `:root[theme-mode='dark'], pass matching selector.
 
 */
function updateCSSVariables(
  variables: { [key: string]: string },
  id = '__vben-styles__',
  selector = ':root',
): void {
  // Legacy implementation delayed stylesheet insertion with setTimeout; synchronous insertion
  // eliminates race conditions and duplicate tags.

  const existingStyles = document.querySelectorAll<HTMLElement>(`#${id}`);
  existingStyles.forEach((element, index) => {
    if (index > 0) {
      element.remove();
    }
  });

  let styleElement = existingStyles[0] ?? null;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = id;
    document.head.append(styleElement);
  }

  // Construct CSS rule text for updated variables
  let cssText = `${selector} {`;
  for (const key in variables) {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      cssText += `${key}: ${variables[key]};`;
    }
  }
  cssText += '}';

  // Assign style text to inline stylesheet
  styleElement.textContent = cssText;
}

export { updateCSSVariables };
