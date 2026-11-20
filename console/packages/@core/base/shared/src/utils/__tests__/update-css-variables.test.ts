import { expect, it } from 'vitest';

import { updateCSSVariables } from '../update-css-variables';

it('updateCSSVariables should update CSS variables in :root selector', () => {
  // Mock initial inline stylesheet content
  const initialStyleContent = ':root { --primaryColor: red; }';
  document.head.innerHTML = `<style id="custom-styles">${initialStyleContent}</style>`;

  // CSS variables and their new values
  const updatedVariables = {
    fontSize: '16px',
    primaryColor: 'blue',
    secondaryColor: 'green',
  };

  // Call function to update CSS variables
  updateCSSVariables(updatedVariables, 'custom-styles');

  // Get updated style content
  const styleElement = document.querySelector('#custom-styles');
  const updatedStyleContent = styleElement ? styleElement.textContent : '';

  // Check that updated styles contain correct values
  expect(
    updatedStyleContent?.includes('primaryColor: blue;') &&
      updatedStyleContent?.includes('secondaryColor: green;') &&
      updatedStyleContent?.includes('fontSize: 16px;'),
  ).toBe(true);
});

it('updateCSSVariables should reuse and deduplicate same-id style tags', () => {
  // Mock duplicate tags from legacy implementation
  document.head.innerHTML =
    '<style id="custom-styles">:root { --primaryColor: red; }</style>' +
    '<style id="custom-styles">:root { --primaryColor: red; }</style>';

  updateCSSVariables({ primaryColor: 'blue' }, 'custom-styles');

  const styleElements = document.querySelectorAll('#custom-styles');

  // Duplicate tags should be cleaned up, leaving only one
  expect(styleElements.length).toBe(1);
  // Updates must write to winning tag
  expect(styleElements[0]?.textContent).toContain('primaryColor: blue;');
});

it('updateCSSVariables should create only one tag when called repeatedly in the same tick', () => {
  document.head.innerHTML = '';

  updateCSSVariables({ primaryColor: 'blue' }, 'custom-styles');
  updateCSSVariables({ primaryColor: 'green' }, 'custom-styles');

  const styleElements = document.querySelectorAll('#custom-styles');

  expect(styleElements.length).toBe(1);
  expect(styleElements[0]?.textContent).toContain('primaryColor: green;');
});

it('updateCSSVariables should support a custom selector', () => {
  document.head.innerHTML = `<style id="tdesign-styles"></style>`;

  // Update CSS variables with custom selector (e.g. TDesign theme-mode)
  updateCSSVariables(
    { '--td-brand-color': 'rgb(0, 82, 217)' },
    'tdesign-styles',
    ":root[theme-mode='dark']",
  );

  const styleElement = document.querySelector('#tdesign-styles');
  const content = styleElement?.textContent ?? '';

  // Selector and variables should both be written correctly
  expect(content.startsWith(":root[theme-mode='dark'] {")).toBe(true);
  expect(content.includes('--td-brand-color: rgb(0, 82, 217);')).toBe(true);
});
