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

/** DOMや通信に依存しない教育用のパスワード評価。 */
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
        feedback.push('⚠️ よく使われる危険なパスワードそのものです！');
    } else if (matchedWord) {
        if (n < 12) {
            score -= 30;
            feedback.push(`⚠️ よく使われる単語 "${matchedWord}" が含まれています`);
        } else if (n < 16) {
            score -= 10;
            feedback.push(`⚠️ 一部に危険な単語 "${matchedWord}" が含まれています`);
        } else if (!(hasUppercase && hasSymbol)) {
            score -= 10;
            feedback.push(`⚠️ 長くても構成が単純で "${matchedWord}" を含むため減点されます`);
        } else {
            feedback.push(`ℹ️ 注意：よく使われる単語 "${matchedWord}" が含まれていますが、構成が十分に強力です`);
        }
    }
    if (/(.)\1{2,}/u.test(password)) {
        score -= 10;
        feedback.push('同じ文字の連続を避けてください');
    }
    if (new Set(characters).size <= 3) {
        score -= 20;
        feedback.push('使われている文字の種類が少なすぎます（3種類以下）');
    }
    if (hasSequence(lowerPassword)) {
        score -= 10;
        feedback.push('連続した文字や数字、キーボード配列の並び（abcd・1234・qwerなど）を避けてください');
    }

    score = Math.min(Math.max(score, 0), 100);
    let strength = 'strong';
    if (score <= 20) strength = 'very-weak';
    else if (score <= 40) strength = 'weak';
    else if (score <= 60) strength = 'fair';
    else if (score <= 80) strength = 'good';

    if (n < 8) feedback.push(`あと${8 - n}文字追加してください（8文字未満はどんな構成でも弱いです）`);
    else if (n < 12) feedback.push('12文字以上にすると強くなります。単語を3〜4個つなげる方法があります');
    else if (n < 16) feedback.push('16文字以上にするとさらに強くなります');
    if (variety === 1) feedback.push('文字の種類を増やすと加点されます（大文字・数字・記号など）');
    return { score, strength, criteria, feedback };
}
