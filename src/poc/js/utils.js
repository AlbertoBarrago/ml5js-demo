/**
 * Logs a message to a specific HTML element or the console.
 * If an element with the ID 'trainingLog' exists, the message is appended to it with a timestamp.
 * Otherwise, the message is logged to the browser console.
 *
 * @param {string} message - The message to be logged.
 * @return {void} This function does not return any value.
 */
// Define globally first
window.log = function log(message) {
    const logDiv = document.getElementById('trainingLog');
    if (!logDiv) {
        console.log(message);
        return;
    }

    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const time = new Date().toLocaleTimeString('it-IT');
    entry.innerHTML = `<span>[${time}]</span> ${message}`;

    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

// Export for ES6 modules
export const log = window.log;