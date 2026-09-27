import { readFileSync } from 'node:fs';

export const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

/**
 * i18n.js は通常のスクリプトなので、Node からは関数として読む。
 * window も localStorage も無い環境で読めることを、ここで確かめていることになる。
 */
export function loadI18n() {
    return new Function(`${read('i18n.js')}
    return I18n;`)();
}

/** scoring.js が返す { key, params } を、実際の文言にする */
export function render(item, I18n) {
    return I18n.t(item.key, item.params || {});
}
