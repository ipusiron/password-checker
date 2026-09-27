import test from 'node:test';
import assert from 'node:assert/strict';

import { read, loadI18n, render } from './helper.js';
import { checkPasswordStrength, parseDictionary } from '../scoring.js';

const I18n = loadI18n();
const html = read('index.html');
const dictionary = parseDictionary(read('common-passwords.txt'));

/** data-i18n="..." / data-i18n-placeholder="..." などに書かれたキーを全部集める */
function keysInHtml() {
    const found = new Set();
    for (const m of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) found.add(m[1]);
    return [...found];
}

/** JS が t("...") / key: "..." で呼んでいるキーを集める */
function keysInScripts() {
    const found = new Set();
    for (const name of ['script.js', 'scoring.js']) {
        const source = read(name);
        for (const m of source.matchAll(/\bt\(\s*["'`]([a-zA-Z][\w.]*)["'`]/g)) found.add(m[1]);
        for (const m of source.matchAll(/key:\s*["']([a-zA-Z][\w.]*)["']/g)) found.add(m[1]);
    }
    // テンプレートリテラルで組み立てているキーは、展開して数える
    for (const strength of ['very-weak', 'weak', 'fair', 'good', 'strong']) found.add(`strength.${strength}`);
    return [...found];
}

test('日本語と英語で、キーの集合が同じ', () => {
    const ja = Object.keys(I18n.ja).sort();
    const en = Object.keys(I18n.en).sort();
    assert.deepEqual(ja.filter((k) => !(k in I18n.en)), [], '英語に無いキーがある');
    assert.deepEqual(en.filter((k) => !(k in I18n.ja)), [], '日本語に無いキーがある');
    assert.equal(ja.length, en.length);
});

test('差し込みの名前が、日本語と英語で一致する', () => {
    const holes = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    const mismatched = Object.keys(I18n.ja).filter((k) => holes(I18n.ja[k]) !== holes(I18n.en[k]));
    assert.deepEqual(mismatched, []);
});

test('index.html が指すキーは、すべて辞書にある', () => {
    const keys = keysInHtml();
    assert.ok(keys.length >= 17, `data-i18n が少なすぎる: ${keys.length}`);
    assert.deepEqual(keys.filter((k) => !(k in I18n.ja)), []);
});

test('スクリプトが呼ぶキーは、すべて辞書にある', () => {
    assert.deepEqual(keysInScripts().filter((k) => !(k in I18n.ja)), []);
});

test('辞書に、日本語のまま残った英語訳がない', () => {
    const jp = /[぀-ヿ一-鿿]/;
    // 言語の切り替えボタンだけは、相手の言語を出すのが正しい
    const expected = new Set(['app.langButton']);
    const untranslated = Object.keys(I18n.en).filter((k) => !expected.has(k) && jp.test(I18n.en[k]));
    assert.deepEqual(untranslated, []);
});

test('t() は差し込みを埋める。知らないキーは黙って通さない', () => {
    assert.equal(I18n.t('feedback.addChars', { count: 3 }), 'あと3文字追加してください（8文字未満はどんな構成でも弱いです）');
    assert.match(I18n.t('feedback.wordShort', { word: 'password' }), /"password"/);
    assert.throws(() => I18n.t('no.such.key'), /Unknown message/);
});

test('採点は文言を持たず { key, params } だけを返す', () => {
    const jp = /[぀-ヿ一-鿿]/;
    for (const password of ['', 'a', 'password', 'mypassword123', 'aaaabcda', 'CorrectHorse!Battery9Staple']) {
        for (const item of checkPasswordStrength(password, dictionary).feedback) {
            assert.equal(typeof item, 'object', password);
            assert.ok(item.key in I18n.ja, `${password}: ${item.key}`);
            assert.ok(!jp.test(JSON.stringify(item)), `${password}: 文言が残っている`);
        }
    }
    assert.doesNotMatch(read('scoring.js').replace(/^\s*(?:\/\/|\*|\/\*).*$/gm, ''), /[぀-ヿ一-鿿]/, 'scoring.js のコードに和文が残っている');
});

test('同じ採点結果が、日本語でも英語でも同じキーで訳せる', () => {
    const result = checkPasswordStrength('mypassword123', dictionary);
    const item = result.feedback[0];
    assert.equal(render(item, I18n), '⚠️ 一部に危険な単語 "password123" が含まれています');
    // 英語の辞書を直に引いても、同じ差し込みが埋まる
    assert.equal(I18n.en[item.key].replace('{word}', item.params.word), '⚠️ Part of it is the risky word "password123"');
    assert.ok(read('i18n.js').includes("const STORAGE_KEY = 'password-checker-language'"));
});

test('表示の状態を、画面の文字列との一致では判定していない', () => {
    const script = read('script.js');
    // 辞書の読み込み失敗は dataset で覚える（言語を切り替えても消えない）
    assert.match(script, /dictionaryStatus\.dataset\.state = 'error'/);
    assert.match(script, /dictionaryStatus\.dataset\.state === 'error'/);
    // 表示/非表示は入力欄の type から判定する（ボタンの文字やラベルを見ない）
    assert.match(script, /passwordInput\.getAttribute\('type'\) === 'password'/);
    assert.doesNotMatch(script, /textContent\s*===/);
    assert.doesNotMatch(script, /getAttribute\('aria-label'\)\s*===/);
});

test('言語の切り替えボタンがあり、i18n.js が他のスクリプトより先に読まれる', () => {
    assert.match(html, /<button type="button" id="langToggle"[^>]*data-i18n="app\.langButton"[^>]*data-i18n-aria-label="app\.langAria"/);
    assert.ok(html.indexOf('<script src="i18n.js"></script>') < html.indexOf('<script type="module" src="script.js"></script>'));
});

test('noscript は日本語と英語を併記する', () => {
    const noscript = html.match(/<noscript>([^<]*)<\/noscript>/)?.[1];
    assert.ok(noscript);
    assert.match(noscript, /JavaScript が必要です/);
    assert.match(noscript, /requires JavaScript/);
});

test('子要素を持つ要素に data-i18n を付けていない', () => {
    // apply() は textContent を置き換えるので、付けた要素は中に要素を持てない
    for (const m of html.matchAll(/<(\w+)([^>]*\bdata-i18n="[^"]+"[^>]*)>([\s\S]*?)<\/\1>/g)) {
        assert.doesNotMatch(m[3], /</, `${m[1]} に子要素がある: ${m[3].slice(0, 40)}`);
    }
});
