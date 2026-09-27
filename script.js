import { checkPasswordStrength, parseDictionary } from './scoring.js';

// i18n.js は index.html で先に読み込まれる通常スクリプト
const I18n = window.I18n;

// DOM要素の取得
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');
const langToggle = document.getElementById('langToggle');
const strengthMeterFill = document.getElementById('strengthMeterFill');
const strengthText = document.getElementById('strengthText');
const scoreDisplay = document.getElementById('scoreDisplay');
const suggestions = document.getElementById('suggestions');
const suggestionsList = document.getElementById('suggestionsList');
const dictionaryStatus = document.getElementById('dictionaryStatus');

// よく使われる弱いパスワードのリスト
let commonPasswords = [];

I18n.init();

document.addEventListener("DOMContentLoaded", () => {
    fetch('common-passwords.txt')
        .then(response => {
            if (!response.ok) throw new Error('Dictionary request failed');
            return response.text();
        })
        .then(text => {
            commonPasswords = parseDictionary(text);
            if (passwordInput.value) evaluateInput();
        })
        .catch(() => {
            // 表示中の文字列ではなく dataset に状態を持たせる（言語を切り替えても失われない）
            dictionaryStatus.dataset.state = 'error';
            renderDictionaryStatus();
        });
});

// 強度に応じた色の定義
const strengthColors = {
    '': '#e1e8ed',
    'very-weak': '#dc3545',
    'weak': '#fd7e14',
    'fair': '#ffc107',
    'good': '#28a745',
    'strong': '#007bff'
};

// パスワードの表示/非表示切り替え
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    renderPasswordToggle();
});

// 言語の切り替え
langToggle.addEventListener('click', () => I18n.setLanguage(I18n.language === 'ja' ? 'en' : 'ja'));
document.addEventListener('languagechange', () => {
    renderDictionaryStatus();
    renderPasswordToggle();
    evaluateInput();
});

// パスワード入力時の処理
passwordInput.addEventListener('input', evaluateInput);

/**
 * 表示/非表示ボタンの見た目とラベルを、いまの入力欄の型から描き直す
 */
function renderPasswordToggle() {
    const hidden = passwordInput.getAttribute('type') === 'password';
    togglePassword.querySelector('span').textContent = hidden ? '👁️' : '🙈';
    togglePassword.setAttribute('aria-pressed', String(!hidden));
    togglePassword.setAttribute('aria-label', I18n.t(hidden ? 'form.showPassword' : 'form.hidePassword'));
}

/**
 * 辞書の読み込み状態を、いまの言語で描き直す
 */
function renderDictionaryStatus() {
    dictionaryStatus.textContent = dictionaryStatus.dataset.state === 'error' ? I18n.t('dictionary.error') : '';
}

/**
 * 現在の入力と読み込み済みの辞書で画面を更新する
 */
function evaluateInput() {
    updateUI(checkPasswordStrength(passwordInput.value, commonPasswords));
}

/**
 * UIを更新する
 * @param {Object} result - チェック結果
 */
function updateUI(result) {
    const { score, strength, criteria, feedback } = result;

    // スコア表示
    scoreDisplay.textContent = score;
    scoreDisplay.className = 'score-display';

    // 強度メーター更新
    strengthMeterFill.style.width = `${score}%`;

    // 強度テキスト更新
    strengthText.textContent = strength ? I18n.t(`strength.${strength}`) : '';
    strengthText.className = `strength-text strength-${strength}`;

    // 強度に応じた色設定
    strengthMeterFill.style.backgroundColor = strengthColors[strength];
    if (strength) scoreDisplay.classList.add(`strength-${strength}`);

    // 条件チェック更新
    updateCriteria('lengthCriteria8', criteria.length8);
    updateCriteria('lengthCriteria12', criteria.length12);
    updateCriteria('lengthCriteria16', criteria.length16);
    updateCriteria('varietyCriteria', criteria.variety2);
    updateCriteria('commonCriteria', criteria.noCommon);

    // 改善提案更新
    if (feedback.length > 0) {
        suggestions.classList.add('show');
        // XSS対策: innerHTML を使わず DOM API で安全に要素を作成
        suggestionsList.replaceChildren();
        feedback.forEach(item => {
            const li = document.createElement('li');
            li.textContent = I18n.t(item.key, item.params || {}); // HTMLエスケープされる
            suggestionsList.appendChild(li);
        });
    } else {
        suggestions.classList.remove('show');
    }
}

/**
 * 評価基準の表示を更新する
 * @param {string} id - 要素のID
 * @param {boolean} isValid - 条件を満たしているか
 */
function updateCriteria(id, isValid) {
    const element = document.getElementById(id);
    const icon = element.querySelector('.criteria-icon');
    element.querySelector('.criteria-status').textContent = I18n.t(isValid ? 'criteria.met' : 'criteria.unmet');

    if (isValid) {
        element.classList.add('valid');
        icon.textContent = '✅';
    } else {
        element.classList.remove('valid');
        icon.textContent = '❌';
    }
}

renderPasswordToggle();
renderDictionaryStatus();
evaluateInput();
