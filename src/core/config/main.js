/**
 * @file main.js
 * @description This file contains the main script for the application.
 * @author Your Name
 * @date 2025-12-18
 */

'use strict';

// --- CONSTANTS ---
const API_ENDPOINT = 'https://api.example.com/data';

// --- FUNCTIONS ---

/**
 * Fetches data from a given URL.
 * @param {string} url - The URL to fetch data from.
 * @returns {Promise<any>} - A promise that resolves with the JSON data.
 */
async function fetchData(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}

// --- EXECUTION ---
document.addEventListener('DOMContentLoaded', () => {
  console.log('Document is ready. Starting application.');
  fetchData(API_ENDPOINT).then(data => {
    console.log('Data received:', data);
  });
});
