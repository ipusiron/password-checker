/** 辞書を正規化する（LF/CRLF・空行・大文字・重複に対応）。 */
export function parseDictionary(text) {
    return [...new Set(text.split(/\r?\n/).map(word => word.trim().toLowerCase()).filter(Boolean))];
}

function hasSequence(lowerPassword) {
    const characters = [...lowerPassword];
    for (let i = 0; i <= characters.length - 4; i++) {
        const run = characters.slice(i, i + 4).join('');
        if (!/^(?:[a-z]{4}|[0-9]{4})$/.test(run)) continue;
        const codes = [...run].map(character => character.codePointAt(0));
        const step = codes[1] - codes[0];
        if (Math.abs(step) === 1 && codes[2] - codes[1] === step && codes[3] - codes[2] === step) {
            return true;
        }
    }
    return ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].some(row => {
        const reversed = [...row].reverse().join('');
        for (let i = 0; i <= row.length - 4; i++) {
            if (lowerPassword.includes(row.slice(i, i + 4)) || lowerPassword.includes(reversed.slice(i, i + 4))) {
                return true;
            }
        }
        return false;
    });
}

/**
 * DOMや通信に依存しない教育用のパスワード評価。
 * feedback は表示用の文字列ではなく { key, params } を返す。
 * 文言は表示の直前に i18n.js の t() で訳す（採点のしきい値やロジックは言語に依存しない）。
 */
export function checkPasswordStrength(password, dictionary = []) {
    const characters = [...password];
    const n = characters.length;
    const lowerPassword = password.toLowerCase();
    const hasUppercase = /[A-Z]/.test(password);
    const hasSymbol = /[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(password);
    const variety = [/[a-z]/.test(password), hasUppercase, /[0-9]/.test(password), hasSymbol,
        characters.some(character => character.codePointAt(0) > 0x7e)].filter(Boolean).length;
    const words = dictionary.map(word => word.toLowerCase()).filter(Boolean);
    const exactMatch = words.includes(lowerPassword);
    let matchedWord = '';
    if (!exactMatch) {
        for (const word of words) {
            if ([...word].length >= 4 && lowerPassword.includes(word) && [...word].length > [...matchedWord].length) {
                matchedWord = word;
            }
        }
    }
    const criteria = {
        length8: n >= 8,
        length12: n >= 12,
        length16: n >= 16,
        variety2: variety >= 2,
        noCommon: !exactMatch && !matchedWord
    };
    const feedback = [];
    if (n === 0) return { score: 0, strength: '', criteria, feedback };

    let score = n < 8 ? 0 : n < 12 ? 20 : n < 16 ? 35 : n < 20 ? 50 : n < 24 ? 60 : 70;
    if (n >= 8) score += Math.min(Math.max(variety - 1, 0), 3) * 10;

    if (exactMatch) {
        score -= 50;
        feedback.push({ key: 'feedback.exactMatch' });
    } else if (matchedWord) {
        if (n < 12) {
            score -= 30;
            feedback.push({ key: 'feedback.wordShort', params: { word: matchedWord } });
        } else if (n < 16) {
            score -= 10;
            feedback.push({ key: 'feedback.wordMedium', params: { word: matchedWord } });
        } else if (!(hasUppercase && hasSymbol)) {
            score -= 10;
            feedback.push({ key: 'feedback.wordLongSimple', params: { word: matchedWord } });
        } else {
            feedback.push({ key: 'feedback.wordLongOk', params: { word: matchedWord } });
        }
    }
    if (/(.)\1{2,}/u.test(password)) {
        score -= 10;
        feedback.push({ key: 'feedback.repeat' });
    }
    if (new Set(characters).size <= 3) {
        score -= 20;
        feedback.push({ key: 'feedback.fewDistinct' });
    }
    if (hasSequence(lowerPassword)) {
        score -= 10;
        feedback.push({ key: 'feedback.sequence' });
    }

    score = Math.min(Math.max(score, 0), 100);
    let strength = 'strong';
    if (score <= 20) strength = 'very-weak';
    else if (score <= 40) strength = 'weak';
    else if (score <= 60) strength = 'fair';
    else if (score <= 80) strength = 'good';

    if (n < 8) feedback.push({ key: 'feedback.addChars', params: { count: 8 - n } });
    else if (n < 12) feedback.push({ key: 'feedback.length12' });
    else if (n < 16) feedback.push({ key: 'feedback.length16' });
    if (variety === 1) feedback.push({ key: 'feedback.variety' });
    return { score, strength, criteria, feedback };
}
