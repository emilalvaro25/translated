/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useLanguageStore } from '@/lib/state';
import { LANGUAGES } from '@/lib/constants';

export default function Header() {
  const { fromLanguage, toLanguage, setFromLanguage, setToLanguage, swapLanguages } = useLanguageStore();

  return (
    <header>
      <div className="language-selectors">
        <div className="language-select-wrapper">
          <select
            value={fromLanguage}
            onChange={(e) => setFromLanguage(e.target.value)}
            aria-label="Translate from"
          >
            {LANGUAGES.map(lang => (
              <option key={`from-${lang.name}`} value={lang.name}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="swap-languages-button"
          onClick={swapLanguages}
          aria-label="Swap languages"
          title="Swap languages"
        >
          <span className="icon">swap_horiz</span>
        </button>
        <div className="language-select-wrapper">
          <select
            value={toLanguage}
            onChange={(e) => setToLanguage(e.target.value)}
            aria-label="Translate to"
          >
            {LANGUAGES.map(lang => (
              <option key={`to-${lang.name}`} value={lang.name}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
