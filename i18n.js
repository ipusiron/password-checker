// 日本語と英語のメッセージ。UI側のスクリプトと採点ロジックは言語ごとの文字列を持たない。
const I18n = (() => {
  const ja = {
    'app.title': 'パスワード強度チェッカー',
    'app.description': '長さを重視した採点と辞書照合でパスワードの強度をリアルタイムに評価し、改善点を提案するWebツール',
    'app.heading': '🔐 パスワード強度チェッカー',
    'app.langButton': 'English',
    'app.langAria': '言語を切り替える',

    'privacy.lead1': 'このツールは完全に ',
    'privacy.strong1': 'ブラウザー内',
    'privacy.tail1': ' で動作します。',
    'privacy.lead2': '入力されたパスワードは ',
    'privacy.strong2': '外部に送信されず',
    'privacy.tail2': '、保存もされません。',

    'form.passwordLabel': 'パスワード',
    'form.passwordPlaceholder': 'パスワードを入力してください',
    'form.showPassword': 'パスワードを表示',
    'form.hidePassword': 'パスワードを隠す',

    'dictionary.error': '辞書ファイルを読み込めませんでした。よく使われるパスワードとの照合なしで評価しています。ローカルで開いている場合は README の「ローカルでの動作とCORS制限について」を参照してください。',

    'strength.very-weak': '非常に弱い',
    'strength.weak': '弱い',
    'strength.fair': '普通',
    'strength.good': '良い',
    'strength.strong': '強力',

    'criteria.length8': '8文字以上',
    'criteria.length12': '12文字以上（推奨）',
    'criteria.length16': '16文字以上',
    'criteria.variety2': '文字の種類が2つ以上（大文字・小文字・数字・記号・その他）',
    'criteria.noCommon': 'よく使われる単語を含まない',
    'criteria.met': '達成',
    'criteria.unmet': '未達成',

    'suggestions.heading': '💡 改善のヒント',

    'feedback.exactMatch': '⚠️ よく使われる危険なパスワードそのものです！',
    'feedback.wordShort': '⚠️ よく使われる単語 "{word}" が含まれています',
    'feedback.wordMedium': '⚠️ 一部に危険な単語 "{word}" が含まれています',
    'feedback.wordLongSimple': '⚠️ 長くても構成が単純で "{word}" を含むため減点されます',
    'feedback.wordLongOk': 'ℹ️ 注意：よく使われる単語 "{word}" が含まれていますが、構成が十分に強力です',
    'feedback.repeat': '同じ文字の連続を避けてください',
    'feedback.fewDistinct': '使われている文字の種類が少なすぎます（3種類以下）',
    'feedback.sequence': '連続した文字や数字、キーボード配列の並び（abcd・1234・qwerなど）を避けてください',
    'feedback.addChars': 'あと{count}文字追加してください（8文字未満はどんな構成でも弱いです）',
    'feedback.length12': '12文字以上にすると強くなります。単語を3〜4個つなげる方法があります',
    'feedback.length16': '16文字以上にするとさらに強くなります',
    'feedback.variety': '文字の種類を増やすと加点されます（大文字・数字・記号など）'
  };

  const en = {
    'app.title': 'Password Strength Checker',
    'app.description': 'A web tool that scores password strength in real time with length-first scoring and a dictionary check, and suggests how to improve it',
    'app.heading': '🔐 Password Strength Checker',
    'app.langButton': '日本語',
    'app.langAria': 'Switch language',

    'privacy.lead1': 'This tool runs entirely ',
    'privacy.strong1': 'inside your browser',
    'privacy.tail1': '. Nothing leaves your device.',
    'privacy.lead2': 'The password you type is ',
    'privacy.strong2': 'never transmitted',
    'privacy.tail2': ' and never stored.',

    'form.passwordLabel': 'Password',
    'form.passwordPlaceholder': 'Type a password',
    'form.showPassword': 'Show password',
    'form.hidePassword': 'Hide password',

    'dictionary.error': 'The dictionary file could not be loaded, so the score is calculated without checking against common passwords. If you opened this page from a local file, see "Running locally and the CORS restriction" in the README.',

    'strength.very-weak': 'Very weak',
    'strength.weak': 'Weak',
    'strength.fair': 'Fair',
    'strength.good': 'Good',
    'strength.strong': 'Strong',

    'criteria.length8': '8 characters or more',
    'criteria.length12': '12 characters or more (recommended)',
    'criteria.length16': '16 characters or more',
    'criteria.variety2': 'Two or more character classes (uppercase, lowercase, digits, symbols, other)',
    'criteria.noCommon': 'Contains no common word',
    'criteria.met': 'Met',
    'criteria.unmet': 'Not met',

    'suggestions.heading': '💡 How to improve',

    'feedback.exactMatch': '⚠️ This is one of the most commonly used passwords!',
    'feedback.wordShort': '⚠️ It contains the common word "{word}"',
    'feedback.wordMedium': '⚠️ Part of it is the risky word "{word}"',
    'feedback.wordLongSimple': '⚠️ It is long, but its structure is simple and it contains "{word}", so points are deducted',
    'feedback.wordLongOk': 'ℹ️ Note: it contains the common word "{word}", but the overall structure is strong enough',
    'feedback.repeat': 'Avoid repeating the same character',
    'feedback.fewDistinct': 'Too few distinct characters are used (three or fewer)',
    'feedback.sequence': 'Avoid runs of letters or digits and keyboard rows (abcd, 1234, qwer and so on)',
    'feedback.addChars': 'Add {count} more character(s). Anything under 8 characters is weak whatever it contains',
    'feedback.length12': '12 characters or more makes it stronger. Joining three or four words is one way',
    'feedback.length16': '16 characters or more makes it stronger still',
    'feedback.variety': 'Using more character classes adds points (uppercase, digits, symbols and so on)'
  };

  let language = 'ja';
  const STORAGE_KEY = 'password-checker-language';

  function t(key, values = {}) {
    const dict = language === 'en' ? en : ja;
    const message = dict[key];
    if (typeof message !== 'string') throw new Error('Unknown message: ' + key);
    return message.replace(/\{(\w+)\}/g, (m, name) => (Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : m));
  }

  function apply(root = document) {
    document.documentElement.lang = language;
    document.title = t('app.title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('app.description'));
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    for (const attr of ['aria-label', 'title', 'placeholder', 'alt', 'content']) {
      root.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`))));
    }
  }

  function setLanguage(value) {
    if (!['ja', 'en'].includes(value)) return;
    language = value;
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* ストレージが使えない環境では記憶しない */ }
    apply();
    document.dispatchEvent(new Event('languagechange'));
  }

  function init() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ストレージが使えない環境では既定に従う */ }
    const query = new URLSearchParams(location.search).get('lang');
    language = [query, saved].find(v => v === 'ja' || v === 'en') || (/^ja\b/i.test(navigator.language || '') ? 'ja' : 'en');
    apply();
  }

  return { ja, en, t, apply, init, setLanguage, get language() { return language; } };
})();

if (typeof window !== 'undefined') window.I18n = I18n;
if (typeof module !== 'undefined' && module.exports) module.exports = I18n;
