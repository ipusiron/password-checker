import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('meta CSP is restricted to self and omits header-only directives', () => {
    const csp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*>/i)?.[1];
    assert.equal(csp, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'");
    assert.doesNotMatch(html, /frame-ancestors|X-Frame-Options/i);
    assert.match(html, /<meta name="referrer" content="no-referrer">/);
});

test('module script, no inline scripts, event handlers or style attributes', () => {
    assert.match(html, /<script src="i18n\.js"><\/script>/);
    assert.match(html, /<script type="module" src="script\.js"><\/script>/);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
    assert.doesNotMatch(html, /\sstyle\s*=/i);
    assert.doesNotMatch(html, /<script\b[^>]*>\s*\S+\s*<\/script>/i);
});

test('password input has privacy-oriented attributes', () => {
    const input = html.match(/<input\b[^>]*id="passwordInput"[^>]*>/s)?.[0];
    assert.ok(input);
    for (const attribute of ['autocomplete="new-password"', 'spellcheck="false"', 'autocapitalize="off"', 'autocorrect="off"', 'data-1p-ignore', 'data-lpignore="true"', 'data-bwignore']) {
        assert.ok(input.includes(attribute), attribute);
    }
});

test('accessible toggle, live score, dictionary status and noscript fallback', () => {
    assert.match(html, /<button type="button" id="togglePassword"[^>]*aria-pressed="false"[^>]*aria-label="パスワードを表示"><span aria-hidden="true">/);
    assert.match(html, /<div aria-live="polite" aria-atomic="true">\s*<div[^>]*id="strengthText"[^>]*><\/div>\s*<div[^>]*id="scoreDisplay"[^>]*>0<\/div>\s*<\/div>/);
    assert.match(html, /id="dictionaryStatus" role="status"/);
    assert.equal([...html.matchAll(/aria-live=/g)].length, 1);
    assert.match(html, /<noscript>このツールは JavaScript が必要です \/ This tool requires JavaScript<\/noscript>/);
});

test('exactly five new criteria have hidden icons and accessible state text', () => {
    const ids = [...html.matchAll(/class="criteria-item" id="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(ids, ['lengthCriteria8', 'lengthCriteria12', 'lengthCriteria16', 'varietyCriteria', 'commonCriteria']);
    assert.equal([...html.matchAll(/class="criteria-icon" aria-hidden="true"/g)].length, 5);
    assert.equal([...html.matchAll(/class="criteria-status visually-hidden">未達成<\/span>/g)].length, 5);
});
