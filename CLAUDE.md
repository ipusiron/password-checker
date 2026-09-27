# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

パスワード強度チェッカー - A Japanese password strength checker web application that evaluates passwords in real-time. Evaluation runs entirely client-side. Only static assets and the bundled dictionary are fetched from the same origin; input is never transmitted or stored by the application.

## Development Commands

```bash
# Local development (required to avoid CORS errors with fetch)
python3 -m http.server 8000
# Then open http://localhost:8000/index.html

# Alternative: Use VS Code Live Server extension

# Tests (Node.js 22+, no dependencies or npm install required)
npm test
```

Note: Opening `index.html` directly via `file://` causes CORS errors for ES modules and the dictionary fetch. Use HTTP, including for browser/CSP verification.

## Architecture

Single-page vanilla JavaScript application without external dependencies:

- **index.html** - UI structure with password input, strength meter, criteria checklist, and suggestions panel
- **script.js** - DOM events, dictionary loading, and UI updates; imports scoring.js as an ES module and reads wording from `window.I18n`
- **i18n.js** - Japanese and English dictionaries plus `t`/`apply`/`init`/`setLanguage`; a classic script loaded before script.js, so it runs in Node through `new Function` as well
- **scoring.js** - Pure `checkPasswordStrength(password, dictionary)` and `parseDictionary(text)` exports; no DOM, no network and no wording (feedback is `{ key, params }`)
- **style.css** - Styling with responsive design
- **common-passwords.txt** - Dictionary of common weak passwords (loaded via fetch)
- **package.json** - ES module configuration and `npm test` (`node --test`)
- **test/** - helper.js, i18n.test.js, scoring.test.js, readme.test.js, html.test.js; includes ten fixed examples, README table consistency checks and the ja/en dictionary checks
- **.github/workflows/test.yml** - GitHub Actions: checkout, setup-node (Node 22), npm test on push and pull_request

### Password Scoring System (scoring.js)

`checkPasswordStrength(password, dictionary)` returns `{ score, strength, criteria, feedback }`.
Length `n` is the code point count (`[...password].length`), not UTF-16 code units.

**Length points:**

| Code points | Points |
|-------------|--------|
| 0 | 0, strength `''`, feedback `[]` |
| 1-7 | 0 total, regardless of composition |
| 8-11 | 20 |
| 12-15 | 35 |
| 16-19 | 50 |
| 20-23 | 60 |
| 24+ | 70 |

**Character variety points (only when n >= 8):**

Five classes: lowercase `[a-z]`, uppercase `[A-Z]`, digits `[0-9]`, symbols (printable ASCII U+0020-U+007E excluding alphanumerics, including space/backtick/tilde), and other (code points above U+007E).
Control characters U+0000-U+001F count toward length but do not form a class.

| Classes present | Points |
|-----------------|--------|
| 0-1 | 0 |
| 2 | 10 |
| 3 | 20 |
| 4+ | 30 |

**Penalties, applied in this order:**

1. Case-insensitive exact dictionary match: -50; never also apply partial-match penalty.
2. Otherwise, partial match of a dictionary word with at least four code points; report the longest match (first in dictionary on equal length):
   - n < 12: -30
   - 12 <= n < 16: -10
   - n >= 16 without both uppercase and an ASCII symbol: -10
   - n >= 16 with both uppercase and an ASCII symbol: 0, but retain the informational warning even at 100 points
3. Repeated character, `/(.)\1{2,}/u`: -10 once.
4. At most three distinct code points (`new Set([...password]).size <= 3`): -20. This is separate from the five character classes.
5. A sequence: -10 once, even for multiple matches. Lowercase the input; detect four or more ASCII letters or four or more digits with consecutive +1 or -1 code point steps, or any consecutive four characters in `qwertyuiop`, `asdfghjkl`, `zxcvbnm` or their reversals.

Clamp the total with `Math.min(Math.max(score, 0), 100)`.

Strength levels: very-weak (0-20), weak (21-40), fair (41-60), good (61-80), strong (81-100)

**Criteria (booleans, not five equal scoring components):**

| Key | HTML id | Condition / UI label |
|-----|---------|----------------------|
| length8 | lengthCriteria8 | 8文字以上 |
| length12 | lengthCriteria12 | 12文字以上（推奨） |
| length16 | lengthCriteria16 | 16文字以上 |
| variety2 | varietyCriteria | 文字の種類が2つ以上（大文字・小文字・数字・記号・その他） |
| noCommon | commonCriteria | よく使われる単語を含まない; neither exact nor eligible partial match |

For empty input, only noCommon is true (there is no dictionary match); strength and feedback remain empty.
`feedback` entries are `{ key, params }`; the wording lives in i18n.js and is resolved with `I18n.t()` right before display.
After all penalty messages, append the length hint (remaining characters to eight; recommend 12 for n=8-11, 16 for n=12-15), then the variety hint if exactly one class is present.

**Fixed examples using the bundled dictionary:**

| Password | Score | Strength |
|----------|-------|----------|
| `password` | 0 | very-weak |
| `P@ssw0rd1!` | 50 | fair |
| `Tr0ub4dor&3` | 50 | fair |
| `mypassword123` | 35 | weak |
| `myp4ssword123` | 45 | fair |
| `correcthorsebatterystaple` | 70 | good |
| `MyDogIsNamedRex2019!` | 90 | strong |
| `aaaaaaaaaaaaaaaaaaaaaaaa` | 40 | weak |
| `abcdefghijklmnop` | 40 | weak |
| `CorrectHorse!Battery9Staple` | 100 | strong |

This is an educational heuristic, not an entropy estimate or NIST compliance checker. See README's evaluation-model section and the primary NIST reference there.

## Key Implementation Details

- Language: `I18n.init()` resolves `?lang=` then localStorage (`password-checker-language`) then `navigator.language`; the toggle re-renders the dictionary notice, the password toggle and the whole result, so nothing on screen is lost
- State is never inferred from displayed text: the dictionary failure lives in `dictionaryStatus.dataset.state`, and the show/hide state comes from the input's `type`
- XSS protection: Uses `textContent` instead of `innerHTML` for user-provided feedback
- Password toggle: native button; switches input type, aria-pressed and aria-label; decorative emoji is aria-hidden
- Common passwords loaded asynchronously on DOMContentLoaded; check response.ok, then parseDictionary (trim, lowercase, remove empty lines and duplicates; LF/CRLF)
- Re-evaluate non-empty input after dictionary load; a role=status warning explains dictionary failure while other scoring continues
- Strength text and score share a polite atomic live region; suggestions are not live; criteria have hidden achieved/not-achieved text
- Meta CSP permits same-origin assets only and omits header-only frame-ancestors/X-Frame-Options; meter updates use CSSOM style properties, never inline style attributes or setAttribute('style')
- Input remains at least 16px; toggle at least 44x44px with visible keyboard focus; reduced-motion disables transitions; body uses 100vh then 100dvh
- Keep README metadata unchanged and bundled dictionary/images untouched. Browser verification uses local HTTP and disposable tooling outside this repository; do not add dependencies
