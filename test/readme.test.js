import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkPasswordStrength, parseDictionary } from '../scoring.js';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const dictionary = parseDictionary(readFileSync(new URL('../common-passwords.txt', import.meta.url), 'utf8'));
const guide = readFileSync(new URL('../CLAUDE.md', import.meta.url), 'utf8');

test('README strength test table contains ten examples with matching scores and point breakdowns', () => {
    const section = readme.split('### パスワードの強度テスト')[1]?.split(/^#{1,3} /m)[0];
    assert.ok(section, 'README strength test section must exist');
    const rows = [...section.matchAll(/^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*(\d+)種\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|([^|]+)\|\s*\*\*(\d+)点\*\*\s*\|$/gm)];
    assert.equal(rows.length, 10, 'table format changes must not silently skip examples');
    for (const [, password, length, variety, lengthPoints, varietyPoints, penalty, score] of rows) {
        assert.equal([...password].length, Number(length), password);
        const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/, /[^\x00-\x7e]/u].filter(pattern => pattern.test(password)).length;
        assert.equal(classes, Number(variety), password);
        const n = Number(length);
        assert.equal(Number(lengthPoints), n < 8 ? 0 : n < 12 ? 20 : n < 16 ? 35 : n < 20 ? 50 : n < 24 ? 60 : 70);
        assert.equal(Number(varietyPoints), Math.min(Math.max(classes - 1, 0), 3) * 10);
        const penalties = [...penalty.matchAll(/-(\d+)/g)].reduce((sum, match) => sum + Number(match[1]), 0);
        assert.equal(Math.min(Math.max(Number(lengthPoints) + Number(varietyPoints) - penalties, 0), 100), Number(score), password);
        assert.equal(checkPasswordStrength(password, dictionary).score, Number(score), password);
    }
});

test('CLAUDE examples match all ten README passwords, scores and strength labels', () => {
    const rows = [...guide.matchAll(/^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*(very-weak|weak|fair|good|strong)\s*\|$/gm)];
    assert.equal(rows.length, 10);
    const readmePasswords = [...readme.matchAll(/^\|\s*`([^`]+)`\s*\|\s*\d+\s*\|\s*\d+種/gm)].map(row => row[1]);
    assert.deepEqual(rows.map(row => row[1]), readmePasswords);
    for (const [, password, score, strength] of rows) {
        const result = checkPasswordStrength(password, dictionary);
        assert.equal(result.score, Number(score), password);
        assert.equal(result.strength, strength, password);
    }
});

test('documentation, scoring result, HTML and DOM mapping share the same five criteria', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
    const criteria = [
        ['length8', 'lengthCriteria8', '8文字以上'],
        ['length12', 'lengthCriteria12', '12文字以上（推奨）'],
        ['length16', 'lengthCriteria16', '16文字以上'],
        ['variety2', 'varietyCriteria', '文字の種類が2つ以上（大文字・小文字・数字・記号・その他）'],
        ['noCommon', 'commonCriteria', 'よく使われる単語を含まない']
    ];
    assert.deepEqual(Object.keys(checkPasswordStrength('', dictionary).criteria), criteria.map(row => row[0]));
    for (const [key, id, label] of criteria) {
        assert.ok(guide.includes(key) && guide.includes(id) && guide.includes(label), `CLAUDE: ${key}`);
        assert.ok(readme.includes(key) && readme.includes(label), `README: ${key}`);
        assert.ok(html.includes(`id="${id}"`) && html.includes(label), `HTML: ${key}`);
        assert.ok(script.includes(`updateCriteria('${id}', criteria.${key})`), `DOM mapping: ${key}`);
    }
});

test('ユースケースの「このツールならではの使い方」の点数は採点の関数と同じ（日英）', () => {
    const readmeEn = readFileSync(new URL('../README.en.md', import.meta.url), 'utf8');
    const score = (password, words = dictionary) => checkPasswordStrength(password, words).score;
    // 4種類を混ぜ、減点のない並び（連番・連続・辞書の語なし）を最大長で切る
    const mixed = 'Kq7!mZ2#rT9$wX4%bN6&pL8*';
    const caps = [8, 12, 16, 24].map(n => score(mixed.slice(0, n)));
    assert.deepEqual(caps, [50, 65, 80, 100]);
    assert.ok(readme.includes(`最大長が8字なら${caps[0]}点、12字なら${caps[1]}点、16字なら${caps[2]}点で頭打ちになり、${caps[3]}点には24字が要る`));
    assert.ok(readmeEn.includes(`the score stops at ${caps[0]} for a maximum of 8 characters, ${caps[1]} for 12 and ${caps[2]} for 16, and a score of ${caps[3]} needs 24`));
    const withCompany = [...dictionary, 'examplecorp'];
    const [a0, a1, b1] = [score('examplecorp2024'), score('examplecorp2024', withCompany), score('Examplecorp2024!', withCompany)];
    assert.deepEqual([a0, a1, b1, score('Examplecorp2024!')], [45, 35, 80, 80]);
    assert.ok(readme.includes(`\`examplecorp2024\`（15字）は${a0}点から${a1}点に下がる`) && readme.includes(`は${b1}点のまま変わらない`));
    assert.ok(readmeEn.includes(`drops from ${a0} to ${a1} points`) && readmeEn.includes(`stays at ${b1}`));
    const [j12, j16] = [score('ねこがこたつでまるくなる'), score('ねこがこたつでまるくなってねむる')];
    assert.deepEqual([j12, j16], [35, 50]);
    assert.ok(readme.includes(`「ねこがこたつでまるくなる」（12字）は${j12}点、「ねこがこたつでまるくなってねむる」（16字）は${j16}点`));
    assert.ok(readmeEn.includes(`scores ${j12} and the 16-character`) && readmeEn.includes(`scores ${j16}.`));
    assert.equal(dictionary.length, 15);
    assert.ok(readme.includes(`辞書も${dictionary.length}語と小さい`) && readmeEn.includes(`small (${dictionary.length} words)`));
});
