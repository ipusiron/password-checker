// DOM要素の取得
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');
const strengthMeterFill = document.getElementById('strengthMeterFill');
const strengthText = document.getElementById('strengthText');
const scoreDisplay = document.getElementById('scoreDisplay');
const suggestions = document.getElementById('suggestions');
const suggestionsList = document.getElementById('suggestionsList');

// よく使われる弱いパスワードのリスト
let commonPasswords = [];

document.addEventListener("DOMContentLoaded", () => {
    fetch('common-passwords.txt')
        .then(response => response.text())
        .then(text => {
            // 改行で分割、空行除去
            commonPasswords = text.split('\n')
                                  .map(p => p.trim())
                                  .filter(p => p.length > 0);
        })
        .catch(error => {
            console.error('パスワードリストの読み込みに失敗しました:', error);
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
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

// パスワード入力時の処理
passwordInput.addEventListener('input', function() {
    const password = this.value;
    const result = checkPasswordStrength(password);
    updateUI(result);
});

/**
 * パスワードの強度をチェックする
 * @param {string} password - チェックするパスワード
 * @returns {Object} スコア、強度、基準、フィードバックを含むオブジェクト
 */
function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];
    const criteria = {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
    };

    const lowerPassword = password.toLowerCase();

    // 空のパスワードチェック
    if (password.length === 0) {
        return { score: 0, strength: '', criteria, feedback: [] };
    }

    // 長さチェック（8文字以上）
    if (password.length >= 8) {
        score += 20;
        criteria.length = true;
    } else {
        feedback.push(`あと${8 - password.length}文字追加してください`);
    }

    // 大文字チェック
    if (/[A-Z]/.test(password)) {
        score += 20;
        criteria.uppercase = true;
    } else {
        feedback.push('大文字（A-Z）を追加してください');
    }

    // 小文字チェック
    if (/[a-z]/.test(password)) {
        score += 20;
        criteria.lowercase = true;
    } else {
        feedback.push('小文字（a-z）を追加してください');
    }

    // 数字チェック
    if (/[0-9]/.test(password)) {
        score += 20;
        criteria.number = true;
    } else {
        feedback.push('数字（0-9）を追加してください');
    }

    // 特殊文字チェック
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        score += 20;
        criteria.special = true;
    } else {
        feedback.push('特殊文字（!@#$%など）を追加してください');
    }

    // ボーナスポイント
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // 完全一致チェック
    if (commonPasswords.includes(lowerPassword)) {
        score = Math.max(score - 50, 0);
        feedback.unshift('⚠️ よく使われる危険なパスワードそのものです！');
    } else {
        // 部分一致チェック（曖昧一致）
        const matchedWord = commonPasswords.find(word => word && lowerPassword.includes(word));
        if (matchedWord) {
            if (password.length < 12) {
                score = Math.max(score - 30, 0);
                feedback.unshift(`⚠️ よく使われる単語 "${matchedWord}" が含まれています`);
            } else if (password.length < 16) {
                score = Math.max(score - 10, 0);
                feedback.unshift(`⚠️ 一部に危険な単語 "${matchedWord}" が含まれています`);
            } else if (!(criteria.uppercase && criteria.special)) {
                score = Math.max(score - 10, 0);
                feedback.unshift(`⚠️ 長くても構成が単純で "${matchedWord}" を含むため減点されます`);
            } else {
                // 減点なし、注意だけ表示
                feedback.unshift(`ℹ️ 注意：よく使われる単語 "${matchedWord}" が含まれていますが、構成が十分に強力です`);
            }
        }
    }

    // 連続する文字チェック
    if (/(.)\1{2,}/.test(password)) {
        score = Math.max(score - 10, 0);
        feedback.push('同じ文字の連続を避けてください');
    }

    // 強度判定
    let strength = '';
    if (score <= 20) strength = 'very-weak';
    else if (score <= 40) strength = 'weak';
    else if (score <= 60) strength = 'fair';
    else if (score <= 80) strength = 'good';
    else strength = 'strong';

    return { score, strength, criteria, feedback };
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
    updateCriteria('lengthCriteria', criteria.length);
    updateCriteria('uppercaseCriteria', criteria.uppercase);
    updateCriteria('lowercaseCriteria', criteria.lowercase);
    updateCriteria('numberCriteria', criteria.number);
    updateCriteria('specialCriteria', criteria.special);

    // 改善提案更新
    if (feedback.length > 0 && score < 100) {
        suggestions.classList.add('show');
        suggestionsList.innerHTML = feedback.map(f => `<li>${f}</li>`).join('');
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
    
    if (isValid) {
        element.classList.add('valid');
        icon.textContent = '✅';
    } else {
        element.classList.remove('valid');
        icon.textContent = '❌';
    }
}
