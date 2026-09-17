import { checkPasswordStrength, parseDictionary } from './scoring.js';

// DOM要素の取得
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');
const strengthMeterFill = document.getElementById('strengthMeterFill');
const strengthText = document.getElementById('strengthText');
const scoreDisplay = document.getElementById('scoreDisplay');
const suggestions = document.getElementById('suggestions');
const suggestionsList = document.getElementById('suggestionsList');
const dictionaryStatus = document.getElementById('dictionaryStatus');

// よく使われる弱いパスワードのリスト
let commonPasswords = [];

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
            dictionaryStatus.textContent = '辞書ファイルを読み込めませんでした。よく使われるパスワードとの照合なしで評価しています。ローカルで開いている場合は README の「ローカルでの動作とCORS制限について」を参照してください。';
        });
});

// 強度ラベルの定義
const strengthLabels = {
    '': '',
    'very-weak': '非常に弱い',
    'weak': '弱い',
    'fair': '普通',
    'good': '良い',
    'strong': '強力'
};

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
togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.querySelector('span').textContent = type === 'password' ? '👁️' : '🙈';
    this.setAttribute('aria-pressed', String(type === 'text'));
    this.setAttribute('aria-label', type === 'password' ? 'パスワードを表示' : 'パスワードを隠す');
});

// パスワード入力時の処理
passwordInput.addEventListener('input', evaluateInput);

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
    strengthText.textContent = strengthLabels[strength];
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
        feedback.forEach(f => {
            const li = document.createElement('li');
            li.textContent = f; // HTMLエスケープされる
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
    element.querySelector('.criteria-status').textContent = isValid ? '達成' : '未達成';
    
    if (isValid) {
        element.classList.add('valid');
        icon.textContent = '✅';
    } else {
        element.classList.remove('valid');
        icon.textContent = '❌';
    }
}

evaluateInput();
