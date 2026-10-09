# Password Checker

English · [日本語](README.md)

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/password-checker?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/password-checker?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/password-checker)
![GitHub license](https://img.shields.io/github/license/ipusiron/password-checker)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/password-checker/)

**Day001 - Security Tools 100 with Generative AI**

A web app that scores password strength as you type, in Japanese and English.

## 🌐 Demo

[https://ipusiron.github.io/password-checker/](https://ipusiron.github.io/password-checker/)

## 📸 Screenshots

Before anything is typed.

![The checker before input, with the five criteria](screenshot.png)

A password scored 50, rated "Fair".

![A result scored 50 and rated Fair, with the five criteria](ss_score50_fair.png)

A password scored 70, rated "Good".

![A result scored 70 and rated Good, with the five criteria](ss_score70_good.png)

## ✨ Features

### Basics
- 🔍 **Live scoring** — the strength is recalculated on every keystroke
- 📊 **Visual strength meter** — a progress bar and colour make the level obvious
- 🔢 **Numeric score** — 0 to 100
- 👁️ **Show / hide the password** — so nobody has to read over your shoulder
- 🌐 **Japanese and English** — switch with the button in the top right; the choice is remembered

### How the score is built

Length counts for more than character variety.
Length is measured in code points (`[...password].length`), so a surrogate pair counts as one character.

| Length | Length points |
|--------|---------------|
| 0 | 0 (no strength shown) |
| 1–7 | 0 (the total is 0 whatever it contains) |
| 8–11 | 20 |
| 12–15 | 35 |
| 16–19 | 50 |
| 20–23 | 60 |
| 24 or more | 70 |

From 8 characters up, points are added for how many of these five classes appear.

- lowercase: `a-z`
- uppercase: `A-Z`
- digits: `0-9`
- symbols: printable ASCII (U+0020–U+007E) that is not alphanumeric, including space, backtick and tilde
- other: code points above U+007E (Japanese, emoji and so on)

| Classes present | Variety points |
|-----------------|----------------|
| 0–1 | 0 |
| 2 | 10 |
| 3 | 20 |
| 4 or more | 30 |

Control characters (U+0000–U+001F) earn no variety points but still count towards the length.

The screen shows these five criteria.

- ✅ 8 characters or more (`length8`)
- ✅ 12 characters or more, recommended (`length12`)
- ✅ 16 characters or more (`length16`)
- ✅ Two or more character classes (`variety2`)
- ✅ Contains no common word — neither an exact nor a partial dictionary match (`noCommon`)

They are not worth 20 points each.
The score is the length points plus the variety points, minus the penalties below, clamped to 0–100.

### Penalties

They are applied in this order.

1. Exact dictionary match: -50 (never combined with the partial-match penalty)
2. Partial match, when there is no exact match: -30, -10 or nothing, per the table below
3. The same character three or more times in a row (`/(.)\1{2,}/u`): -10
4. Three or fewer distinct code points: -20 (separate from the five classes above)
5. A run: -10, once, however many runs there are

A run is four or more letters or digits in the lowercased input whose code points step by +1 or -1.
`abcd`, `dcba`, `1234` and `4321` qualify, and so do four consecutive keys from the rows `qwertyuiop`, `asdfghjkl` and `zxcvbnm`, in either direction.

### ⚖️ How the partial-match penalty is scaled

| Condition | Penalty |
|-----------|---------|
| Shorter than 12 characters | -30 |
| 12–15 characters | -10 |
| 16 or more, without both an uppercase letter and a symbol | -10 |
| 16 or more, with both an uppercase letter and a symbol | none (only an ℹ️ note) |

Below 8 characters the hint says how many characters are still needed; at 8–11 it suggests 12 or more, and at 12–15 it suggests 16 or more.
With only one character class, a hint to add more classes appears too.
Penalty explanations come first and improvement hints second, and the note is still shown at 100.

### Strength levels
- 🔴 **Very weak** (0–20)
- 🟠 **Weak** (21–40)
- 🟡 **Fair** (41–60)
- 🟢 **Good** (61–80)
- 🔵 **Strong** (81–100)

## 🔬 Where this model stands

The scoring here is a simple teaching model that weights length above everything else.
[NIST SP 800-63B-4 (August 2025)](https://pages.nist.gov/800-63-4/sp800-63b.html) asks verifiers not to impose composition rules, to require at least 15 characters when a password is the only authentication factor, and to compare candidates against a list of commonly used passwords.
This tool likewise scores mainly on length and a dictionary check, and treats character variety as a bonus only.

That said, the NIST check applies to the password as a whole, whereas the partial-match penalty and the point values here are our own.
They are no guarantee of NIST conformance or of real-world safety.
When choosing a real password, follow the rules of the service and let a password manager generate it.

### Worked examples

| Password | Length | Classes | Length pts | Variety pts | Penalties | Score |
|----------|--------|---------|------------|-------------|-----------|-------|
| `password` | 8 | 1 | 20 | 0 | exact match -50 | **0** |
| `P@ssw0rd1!` | 10 | 4 | 20 | 30 | none | **50** |
| `Tr0ub4dor&3` | 11 | 4 | 20 | 30 | none | **50** |
| `mypassword123` | 13 | 2 | 35 | 10 | partial match (password123) -10 | **35** |
| `myp4ssword123` | 13 | 2 | 35 | 10 | none | **45** |
| `correcthorsebatterystaple` | 25 | 1 | 70 | 0 | none | **70** |
| `MyDogIsNamedRex2019!` | 20 | 4 | 60 | 30 | none | **90** |
| `aaaaaaaaaaaaaaaaaaaaaaaa` | 24 | 1 | 70 | 0 | repeated character -10, three or fewer distinct -20 | **40** |
| `abcdefghijklmnop` | 16 | 1 | 50 | 0 | run -10 | **40** |
| `CorrectHorse!Battery9Staple` | 27 | 4 | 70 | 30 | none | **100** |

These are published examples for checking the behaviour. Do not use them as real passwords.

## 📖 Usage

### Online
1. Open the [demo page](https://ipusiron.github.io/password-checker/).
2. Type a password. It is never sent anywhere and this tool never stores it.
3. Watch the strength update as you type.

### Locally
1. Clone the repository.
```bash
git clone https://github.com/ipusiron/password-checker.git
```

2. Enter the project folder.
```bash
cd password-checker
```

3. Start an HTTP server and open [http://localhost:8000/](http://localhost:8000/).
```bash
python3 -m http.server 8000
```

Opening `index.html` directly over `file://` does not work, because of the CORS restriction.
See "Running locally and the CORS restriction" below.

## 🎯 Use cases

### Ways of using this tool in particular

- Seeing how the maximum length of an input field caps the score: people who design sign-up forms check the score that can be reached under a given maximum length. Even with all four character types and no penalties, the score stops at 50 for a maximum of 8 characters, 65 for 12 and 80 for 16, and a score of 100 needs 24 characters. This is material for reviewing designs that cap password length at a small number (the score is an educational guide, not a measure of how hard a password is to guess)
- Trying an organization's blocklist: IT or general affairs staff add a company name to the custom dictionary and check whether passwords containing it lose points. With the fictional company name examplecorp added, `examplecorp2024` (15 characters) drops from 45 to 35 points, while `Examplecorp2024!` (16 characters, with an uppercase letter and a symbol) stays at 80. You can compare this tool's line, "long enough and varied enough passwords lose no points even when they contain a dictionary word", with your own policy
- Comparing Japanese passphrases by length: characters outside ASCII count as one type, so a sentence written only in hiragana gains points with length. The 12-character "ねこがこたつでまるくなる" scores 35 and the 16-character "ねこがこたつでまるくなってねむる" scores 50. Families and classes can try the idea of a long sentence that is easy to remember (check separately whether the service accepts Japanese and whether the input method changes the characters)

### Education

- In an information class, students compare the scores of a long sentence that is not in the dictionary and a short word mixed with symbols, and experience the length-first approach (NIST SP 800-63B-4)
- Students recompute the ten examples in the "Worked examples" table above by hand, split into length points, variety points and penalties

### Work (outside security)

- People who explain an internal password policy show, on one screen, a rule that requires a symbol next to how the score grows when the password gets longer

### Home and family

- When choosing a password for an account shared by the family, enter an example of a similar shape and check that it contains no runs (abcd, 1234) or keyboard rows (such as qwer). Do not enter the real password itself

### Hobbies and creative work

- When writing a weak password for a character in a novel or a game, use the score and the reasons for penalties (a dictionary word, repeated characters and so on) as a reference

### Research

- The scoring function (`scoring.js`) does not depend on the page, so you can run a published list of common passwords through it and study how length relates to the score

### Combining with other tools

- Use [PassCloud](https://ipusiron.github.io/passcloud/) (Day019) to find words that appear often in a password list, and add them to this tool's custom dictionary
- Use [Token Entropy Estimator](https://ipusiron.github.io/token-entropy-estimator/) (Day048) to estimate the information (bits) of a randomly generated string, and compare it with this tool's length-first score
- For 4-digit PINs, check their resistance to shoulder surfing and guessing separately with [PIN Threat Simulator](https://ipusiron.github.io/pin-threat-simulator/) (Day088)

### Limitations

- The score is an educational guide and does not compute how many guesses an attacker needs. The dictionary is also small (15 words)
- Input is processed only in the browser, but the screen can be seen by others, so do not enter a password you actually use

## 🛠 Built with

- **HTML5** — structure
- **CSS3** — styling (gradients, transitions)
- **JavaScript** (vanilla) — logic and DOM handling
- **Regular expressions** — pattern checks on the password
- **A small home-grown i18n layer** (`i18n.js`) — Japanese and English dictionaries, swapped in through `data-i18n` attributes

## 🔒 Security

Scoring happens inside the browser.
The password is never transmitted and never written to a cookie.
The only thing kept in Web Storage (`localStorage`) is the chosen display language, `ja` or `en`.
On load, the HTML, CSS, JavaScript and dictionary all come from the same origin.
What you type stays in the input field and in the scoring code, so it is not wiped from memory the instant you stop typing.
Anything outside this tool, such as a browser extension, is beyond its control.

### 💡 If you would rather be careful

- Use a private or incognito window.
- Once the page and the dictionary have loaded, you can disconnect from the network and keep using it.
- Download the code and run it locally.
- Watch the traffic with the browser developer tools or a packet capture tool.

## 🌐 Display language

The button in the top right switches between Japanese and English.

- The initial language comes from the `?lang=ja` / `?lang=en` query, then the previous choice, then the browser's language setting
- The choice is stored in `localStorage` under the key `password-checker-language`
- Switching does not clear the password you are typing or the result on screen
- Thresholds, penalties and strength brackets do not depend on the language: `scoring.js` holds no wording and returns keys only

## 📚 Custom dictionary

The tool compares the input against `common-passwords.txt`, a plain list of commonly used passwords.
As with other wordlists, the format is **one word per line**.

### 🔤 How the dictionary is read

The file is split on line breaks; each line is trimmed (CR included) and lowercased, then blanks and duplicates are dropped. CRLF files are fine.
The input is lowercased for matching, but the original input is used for the length and variety scoring.
Entries shorter than four code points are excluded from partial matching, though they still count for an exact match.
When several entries match partially, the longest in code points is reported; ties go to whichever appears first in the file.

### ⚠️ When the dictionary cannot be loaded

If the fetch fails (an HTTP error, for instance), the page says so: "The dictionary file could not be loaded, so the score is calculated without checking against common passwords."
Everything except the dictionary check keeps working.
If you type before the file has loaded, the input is re-scored once it arrives.

### 🔹 Well-known wordlists

The list is yours to replace. These public collections make good sources.

- [SecLists](https://github.com/danielmiessler/SecLists)
  - Password lists live under `Passwords/Common-Credentials/` and `Passwords/Leaked-Databases/`.
  - For example `10-million-password-list-top-1000.txt`.

- [rockyou.txt](https://github.com/brannondorsey/naive-hashcat/releases/)
  - `rockyou.txt` is in the release assets. It is large.
  - It originates from a breach, so use it for education and research only.

### 🔄 Using part of a larger list

Take a slice of a big file, such as the first 1000 lines.

```bash
head -n 1000 /path/to/rockyou.txt > common-passwords.txt
```

## ⚠️ Running locally and the CORS restriction

The tool uses ES modules and loads `common-passwords.txt` with `fetch()`.
Double-clicking `index.html` to open it over `file://` breaks both: the CORS policy blocks the modules and the dictionary.
If the modules themselves fail to load, even the "dictionary not loaded" notice cannot appear.
Serve the page over HTTP. Otherwise the dictionary fetch fails like this.

>Access to fetch at 'file:///.../common-passwords.txt' from origin 'null' has been blocked by CORS policy

### ✅ Any of these will do

#### 1. Python's HTTP server

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/index.html.

#### 2. VS Code with the Live Server extension

Install "Live Server", right-click `index.html` and choose "Open with Live Server".

#### 3. Any web server

Apache, Nginx, GitHub Pages, Netlify and the like all serve the page well enough for `fetch()` to work.

## 🧪 Tests

With Node.js 22 or later, run the following. There are no dependencies, so `npm install` is not needed.

```bash
npm test
```

Node's built-in `node --test` checks the scoring, the agreement between the README table and the computed results, the security and accessibility requirements in the HTML, and the consistency of the Japanese and English dictionaries.
GitHub Actions runs the same suite on Node.js 22 for every push and pull request.

## 👏 Credits

- Icons: native emoji
- Fonts: system fonts
- Colour palette: a custom gradient

## 📞 Contact

- GitHub: [@ipusiron](https://github.com/ipusiron)

## 📁 Directory layout

```text
password-checker/
├── .github/
│   └── workflows/
│       └── test.yml      # tests on push and pull_request
├── test/
│   ├── helper.js         # loads i18n.js and other test helpers
│   ├── i18n.test.js      # consistency of the Japanese and English dictionaries
│   ├── scoring.test.js   # the scoring rules and the dictionary
│   ├── readme.test.js    # the README table against the computed scores
│   └── html.test.js      # security and accessibility of the HTML
├── .gitignore           # files Git ignores
├── index.html           # input field, strength display and criteria
├── i18n.js              # Japanese and English messages, and the switch
├── script.js            # DOM handling and dictionary loading
├── scoring.js           # scoring and dictionary parsing, free of the DOM
├── style.css            # layout, mobile support, reduced motion
├── common-passwords.txt # the bundled password list
├── package.json         # ES module setting and the dependency-free test command
├── screenshot.png       # the empty screen (cover image)
├── ss_score40.png       # an old score (no longer referenced in the text)
├── ss_score70.png       # an old score (no longer referenced in the text)
├── ss_score50_fair.png  # 50 points, "Fair", under the current rules
├── ss_score70_good.png  # 70 points, "Good", under the current rules
├── CLAUDE.md            # structure, scoring rules and development notes
├── README.md            # the Japanese documentation
├── README.en.md         # this document
└── LICENSE              # MIT
```

## 💻 Requirements

- To use: a modern browser with ES modules and the Fetch API
- To serve locally: Python's HTTP server or similar (`file://` is not supported)
- To test: Node.js 22 or later, no external packages

## 📄 License

[MIT License](LICENSE) — use it freely.

## 🛠️ About this tool

This tool is part of "Security Tools 100 with Generative AI", a project that builds and publishes a security-related tool every day for 100 days with the help of generative AI.

For the project and the other tools, see the page below.

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
