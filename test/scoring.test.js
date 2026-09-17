import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkPasswordStrength, parseDictionary } from '../scoring.js';

const dictionary = parseDictionary(readFileSync(new URL('../common-passwords.txt', import.meta.url), 'utf8'));
const samples = [
    ['password', 0, 'very-weak'],
    ['P@ssw0rd1!', 50, 'fair'],
    ['Tr0ub4dor&3', 50, 'fair'],
    ['mypassword123', 35, 'weak'],
    ['myp4ssword123', 45, 'fair'],
    ['correcthorsebatterystaple', 70, 'good'],
    ['MyDogIsNamedRex2019!', 90, 'strong'],
    ['aaaaaaaaaaaaaaaaaaaaaaaa', 40, 'weak'],
    ['abcdefghijklmnop', 40, 'weak'],
    ['CorrectHorse!Battery9Staple', 100, 'strong']
];
for (const [password, score, strength] of samples) {
    test(`A-7: ${password}`, () => {
        const result = checkPasswordStrength(password, dictionary);
        assert.equal(result.score, score);
        assert.equal(result.strength, strength);
    });
}

test('empty input has no strength or feedback; noCommon means no dictionary match', () => {
    assert.deepEqual(checkPasswordStrength('', dictionary), {
        score: 0, strength: '',
        criteria: { length8: false, length12: false, length16: false, variety2: false, noCommon: true },
        feedback: []
    });
});

for (const [n, score] of [[1, 0], [7, 0], [8, 20], [11, 20], [12, 35], [15, 35], [16, 50], [19, 50], [20, 60], [23, 60], [24, 70], [64, 70]]) {
    test(`length boundary ${n}`, () => {
        const result = checkPasswordStrength('azjy'.repeat(16).slice(0, n), []);
        assert.equal(result.score, score);
        assert.equal(result.criteria.length8, n >= 8);
        assert.equal(result.criteria.length12, n >= 12);
        assert.equal(result.criteria.length16, n >= 16);
    });
}

test('fewer than eight code points scores zero even with five character classes', () => {
    const result = checkPasswordStrength('aB7!😀本語', []);
    assert.equal(result.score, 0);
    assert.equal(result.strength, 'very-weak');
    assert.ok(result.feedback.includes('あと1文字追加してください（8文字未満はどんな構成でも弱いです）'));
});

for (const [password, score] of [['azjyazjy', 20], ['azjyazjY', 30], ['azjyazY7', 40], ['azjyaY7!', 50], ['azjyY7!語', 50], ['😀😁😂😃😄😅😆😉', 20]]) {
    test(`character classes: ${password}`, () => {
        assert.equal(checkPasswordStrength(password, []).score, score);
    });
}

test('all printable ASCII non-alphanumerics, including space, backtick and tilde, are symbols', () => {
    for (let code = 0x20; code <= 0x7e; code++) {
        const character = String.fromCodePoint(code);
        if (!/[a-z0-9]/i.test(character)) {
            assert.equal(checkPasswordStrength('azjyazj' + character, []).score, 30, `U+${code.toString(16)}`);
        }
    }
    assert.equal(checkPasswordStrength('azjyazj\u001f', []).score, 20);
    assert.equal(checkPasswordStrength('azjyazj\u007f', []).score, 30);
});

test('dictionary exact match is case-insensitive and never also a partial match', () => {
    const result = checkPasswordStrength('PASSWORD', ['PASSWORD', 'word']);
    assert.equal(result.score, 0);
    assert.equal(result.criteria.noCommon, false);
    assert.equal(result.feedback[0], '⚠️ よく使われる危険なパスワードそのものです！');
    assert.equal(result.feedback.filter(message => message.startsWith('⚠️')).length, 1);
});

for (const [password, penalty, message] of [
    ['xpassword', 30, '⚠️ よく使われる単語 "password" が含まれています'],
    ['mypasswordxy', 10, '⚠️ 一部に危険な単語 "password" が含まれています'],
    ['mypasswordxyazjy', 10, '⚠️ 長くても構成が単純で "password" を含むため減点されます'],
    ['Mypasswordxyazj!', 0, 'ℹ️ 注意：よく使われる単語 "password" が含まれていますが、構成が十分に強力です']
]) {
    test(`partial match stage: ${password}`, () => {
        const result = checkPasswordStrength(password, dictionary);
        assert.equal(result.score, Math.max(0, checkPasswordStrength(password, []).score - penalty));
        assert.equal(result.feedback[0], message);
        assert.equal(result.criteria.noCommon, false);
    });
}

test('long partial match exemption requires both uppercase and ASCII symbol', () => {
    for (const password of ['Mypasswordxyazjy', 'mypasswordxyazj!', 'Mypasswordxyazj語']) {
        assert.equal(checkPasswordStrength(password, dictionary).score, checkPasswordStrength(password, []).score - 10);
    }
});

test('longest partial match is reported independently of dictionary order', () => {
    for (const words of [dictionary, [...dictionary].reverse()]) {
        assert.equal(checkPasswordStrength('mypassword123', words).feedback[0], '⚠️ 一部に危険な単語 "password123" が含まれています');
    }
});

test('dictionary words below four code points are excluded only from partial matches', () => {
    assert.equal(checkPasswordStrength('azjycat7', ['cat']).criteria.noCommon, true);
    assert.equal(checkPasswordStrength('cat', ['CAT']).criteria.noCommon, false);
    assert.equal(checkPasswordStrength('azjy日本語7', ['日本語']).criteria.noCommon, true);
    assert.equal(checkPasswordStrength('azjy😀😁7!', ['😀😁']).criteria.noCommon, true);
    assert.equal(checkPasswordStrength('azjycatx', ['catx']).criteria.noCommon, false);
});

test('repeating any code point at least three times subtracts ten only once', () => {
    assert.equal(checkPasswordStrength('aaazjyux', []).score, 10);
    const result = checkPasswordStrength('😀😀😀azjyx', []);
    assert.equal(result.score, 20);
    assert.ok(result.feedback.includes('同じ文字の連続を避けてください'));
    assert.equal(checkPasswordStrength('aaazzzjy', []).score, 10);
});

test('three or fewer distinct code points subtracts twenty independently of classes', () => {
    assert.equal(checkPasswordStrength('aB7aB7aB', []).score, 20);
    assert.equal(checkPasswordStrength('aB7!aB7!', []).score, 50);
});

for (const run of ['abcd', 'dcba', '1234', '4321', 'qwer', 'rewq', 'uiop', 'poiu', 'asdf', 'fdsa', 'hjkl', 'lkjh', 'zxcv', 'vcxz', 'vbnm', 'mnbv', 'ABCD']) {
    test(`sequence penalty: ${run}`, () => {
        const result = checkPasswordStrength('azjy' + run, []);
        const varietyPoints = /[0-9A-Z]/.test(run) ? 10 : 0;
        assert.equal(result.score, 20 + varietyPoints - 10);
        assert.equal(result.feedback.filter(message => message.startsWith('連続した')).length, 1);
    });
}

test('multiple sequences incur only one ten-point penalty', () => {
    assert.equal(checkPasswordStrength('abcd1234qwerASDF', []).score, 60);
});

test('short, wrapping, non-ASCII and mixed non-sequences are not penalized', () => {
    for (const password of ['azjyabc7', 'azjy8901', 'azjyxyzA', 'azjyab12', 'azjyあいうえ']) {
        assert.ok(!checkPasswordStrength(password, []).feedback.some(message => message.startsWith('連続した')));
    }
});

test('penalty feedback precedes length and variety hints in specification order', () => {
    const result = checkPasswordStrength('aaaabcda', ['abcd']);
    assert.deepEqual(result.feedback, [
        '⚠️ よく使われる単語 "abcd" が含まれています',
        '同じ文字の連続を避けてください',
        '連続した文字や数字、キーボード配列の並び（abcd・1234・qwerなど）を避けてください',
        '12文字以上にすると強くなります。単語を3〜4個つなげる方法があります',
        '文字の種類を増やすと加点されます（大文字・数字・記号など）'
    ]);
    assert.equal(checkPasswordStrength('azjyazjyazjy', []).feedback[0], '16文字以上にするとさらに強くなります');
    assert.deepEqual(checkPasswordStrength('aaaaaaaa', ['aaaaaaaa']).feedback.slice(0, 3), [
        '⚠️ よく使われる危険なパスワードそのものです！',
        '同じ文字の連続を避けてください',
        '使われている文字の種類が少なすぎます（3種類以下）'
    ]);
});

for (const [password, score, strength] of [
    ['azjyazjy', 20, 'very-weak'], ['azjyazjyazjy', 35, 'weak'],
    ['azjyazY7', 40, 'weak'], ['azjyazjyazjY', 45, 'fair'],
    ['azjy'.repeat(4) + 'Y', 60, 'fair'], ['azjyazjyY7!x', 65, 'good'],
    ['azjy'.repeat(4) + 'Y7!', 80, 'good'], ['azjy'.repeat(5) + 'Y7!', 90, 'strong']
]) {
    test(`strength bracket ${score}`, () => {
        const result = checkPasswordStrength(password, []);
        assert.equal(result.score, score);
        assert.equal(result.strength, strength);
    });
}

test('upper and lower bounds; advisory feedback remains at 100', () => {
    assert.equal(checkPasswordStrength('CorrectHorse!Battery9Staple', dictionary).score, 100);
    assert.equal(checkPasswordStrength('a', ['a']).score, 0);
    const result = checkPasswordStrength('MyPassword!Battery9Staple', dictionary);
    assert.equal(result.score, 100);
    assert.ok(result.feedback[0].startsWith('ℹ️'));
});

test('parseDictionary handles CRLF, whitespace, case, blanks and duplicate entries', () => {
    assert.deepEqual(parseDictionary(' Password\r\n\r\nADMIN\n password \n admin\r\n\t\n'), ['password', 'admin']);
    assert.deepEqual(parseDictionary(''), []);
});

test('scoring leaves caller dictionary untouched and returns fresh results', () => {
    const words = Object.freeze(['PASSWORD', 'word']);
    const first = checkPasswordStrength('mypassword123', words);
    first.feedback.length = 0;
    assert.equal(checkPasswordStrength('mypassword123', words).feedback[0], '⚠️ 一部に危険な単語 "password" が含まれています');
});
