# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

パスワード強度チェッカー - A Japanese password strength checker web application that evaluates passwords in real-time. Runs entirely client-side with no server communication.

## Development Commands

```bash
# Local development (required to avoid CORS errors with fetch)
python3 -m http.server 8000
# Then open http://localhost:8000/index.html

# Alternative: Use VS Code Live Server extension
```

Note: Opening `index.html` directly via `file://` will cause CORS errors because `script.js` fetches `common-passwords.txt`.

## Architecture

Single-page vanilla JavaScript application with three main files:

- **index.html** - UI structure with password input, strength meter, criteria checklist, and suggestions panel
- **script.js** - Core password evaluation logic
- **style.css** - Styling with responsive design
- **common-passwords.txt** - Dictionary of common weak passwords (loaded via fetch)

### Password Scoring System (script.js)

The `checkPasswordStrength()` function calculates a 0-100 score:

**Base points (20 each):**
- 8+ characters
- Contains uppercase (A-Z)
- Contains lowercase (a-z)
- Contains numbers (0-9)
- Contains special characters

**Bonuses:** +10 for 12+ chars, +10 for 16+ chars

**Penalties:**
- Exact match in common passwords: -50
- Partial match with common password: -10 to -30 (scaled by length and complexity)
- Repeated characters (3+): -10

Strength levels: very-weak (0-20), weak (21-40), fair (41-60), good (61-80), strong (81-100)

## Key Implementation Details

- XSS protection: Uses `textContent` instead of `innerHTML` for user-provided feedback
- Password toggle: Switches input type between 'password' and 'text'
- Common passwords loaded asynchronously on DOMContentLoaded
- Partial match detection uses case-insensitive comparison via `toLowerCase()`
