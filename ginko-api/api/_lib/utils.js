"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = sanitizeInput;
exports.parseJSON = parseJSON;
// Common utility functions
function sanitizeInput(input) {
    return input.trim().replace(/[^\w\s-]/gi, '');
}
function parseJSON(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
