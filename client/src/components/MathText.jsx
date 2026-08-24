import React from 'react';
import katex from 'katex';

/**
 * MathText Component — Robust KaTeX renderer
 *
 * Handles all common AI output formats:
 *  - $$...$$          display math
 *  - $...$            inline math
 *  - \[...\]          display math
 *  - \(...\)          inline math
 *  - \$...\$          escaped-dollar math (AI sometimes outputs this)
 *  - plain-text powers/roots/symbols (e.g. x^2, sqrt(x), alpha)
 *  - Newlines → rendered as line breaks
 */

function renderKatex(latex, displayMode) {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true
    });
  } catch {
    // fall back to escaped raw text so it's still readable
    return `<code>${latex}</code>`;
  }
}

/**
 * Tokenize a string into an alternating array of {type, content} tokens:
 *   type: 'math-block' | 'math-inline' | 'text'
 */
function tokenize(raw) {
  const tokens = [];

  // Normalize escaped dollar signs that the AI sometimes emits:
  //   \$...\$  →  $...$   (the AI thinks it's escaping but we want real math)
  //   \$lambda$  →  $\lambda$  etc.
  // We do this by replacing \$ with a safe placeholder, then restoring later.
  // But actually it's cleaner to just strip the backslash before $ globally
  // when it's not part of a known LaTeX command (\\, \n, \t etc.)
  let s = raw.replace(/\\(\$)/g, '$');   // \$ → $

  // Also normalize \beta, \lambda etc that appear OUTSIDE of $ delimiters
  // (the AI sometimes writes them raw outside math mode)
  // We'll handle these in the plain-text post-pass below.

  // --- Tokenizer: scan character by character ---
  let i = 0;
  let textBuf = '';

  const flushText = () => {
    if (textBuf) {
      tokens.push({ type: 'text', content: textBuf });
      textBuf = '';
    }
  };

  while (i < s.length) {
    // ---- Display math: $$...$$ ----
    if (s[i] === '$' && s[i + 1] === '$') {
      const end = s.indexOf('$$', i + 2);
      if (end !== -1) {
        flushText();
        tokens.push({ type: 'math-block', content: s.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // ---- Inline math: $...$ (single $, not $$) ----
    if (s[i] === '$' && s[i + 1] !== '$') {
      // find the closing $
      let j = i + 1;
      while (j < s.length && s[j] !== '$') {
        if (s[j] === '\\') j++; // skip escaped char
        j++;
      }
      if (j < s.length && j > i + 1) {
        flushText();
        tokens.push({ type: 'math-inline', content: s.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
    }

    // ---- Display math: \[...\] ----
    if (s[i] === '\\' && s[i + 1] === '[') {
      const end = s.indexOf('\\]', i + 2);
      if (end !== -1) {
        flushText();
        tokens.push({ type: 'math-block', content: s.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // ---- Inline math: \(...\) ----
    if (s[i] === '\\' && s[i + 1] === '(') {
      const end = s.indexOf('\\)', i + 2);
      if (end !== -1) {
        flushText();
        tokens.push({ type: 'math-inline', content: s.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // ---- Newline → keep as newline ----
    if (s[i] === '\n') {
      textBuf += '\n';
      i++;
      continue;
    }

    textBuf += s[i];
    i++;
  }

  flushText();
  return tokens;
}

/**
 * Post-process a plain text segment to auto-wrap common math patterns
 * that the AI forgot to put in $...$ delimiters.
 */
function autoWrapPlainMath(text) {
  let s = text;

  // x^2, A^{T}, (X^TX), e^{-\lambda x} etc — wrap if not already in $
  // Only match patterns that look like math (avoid wrapping normal text like "CO2")
  s = s.replace(/(?<!\$)([a-zA-Z_][a-zA-Z0-9_]*|\([^)]+\))\^(\{[^}]+\}|[a-zA-Z0-9_\-\+\.]+)(?!\$)/g,
    (match, base, exp) => `$${base}^${exp}$`
  );

  // sqrt(x) → $\sqrt{x}$
  s = s.replace(/\bsqrt\(([^)]+)\)/gi, (_, inner) => `$\\sqrt{${inner}}$`);

  // Bare LaTeX commands outside math mode: \implies, \alpha, \beta etc.
  // e.g. "\implies" → "$\implies$"
  const latexCommands = [
    'implies', 'iff', 'forall', 'exists', 'nabla', 'partial',
    'infty', 'cdot', 'times', 'div', 'pm', 'mp',
    'leq', 'geq', 'neq', 'approx', 'equiv', 'propto',
    'sum', 'prod', 'int', 'oint', 'bigcup', 'bigcap',
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta',
    'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi',
    'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega',
    'frac', 'sqrt', 'hat', 'bar', 'vec', 'dot', 'ddot',
    'mathbf', 'mathrm', 'mathcal', 'text'
  ];
  const cmdPattern = new RegExp(
    `(?<!\\$)\\\\(${latexCommands.join('|')})(\\{[^}]*\\})?(?!\\$)`,
    'g'
  );
  s = s.replace(cmdPattern, (match) => `$${match}$`);

  return s;
}

export default function MathText({ text, style, className }) {
  if (!text || typeof text !== 'string') {
    return <span style={style} className={className}>{text || ''}</span>;
  }

  const tokens = tokenize(text);

  return (
    <span style={{ ...style, whiteSpace: 'pre-wrap' }} className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'math-block') {
          return (
            <span
              key={idx}
              dangerouslySetInnerHTML={{ __html: renderKatex(token.content, true) }}
              style={{ display: 'block', margin: '10px 0', textAlign: 'center' }}
            />
          );
        }

        if (token.type === 'math-inline') {
          return (
            <span
              key={idx}
              dangerouslySetInnerHTML={{ __html: renderKatex(token.content, false) }}
              style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 1px' }}
            />
          );
        }

        // Plain text — auto-wrap any missed math patterns
        const processed = autoWrapPlainMath(token.content);

        // If the auto-wrap introduced $ signs, tokenize recursively (one level deep)
        if (processed !== token.content && processed.includes('$')) {
          const subTokens = tokenize(processed);
          return (
            <span key={idx}>
              {subTokens.map((sub, subIdx) => {
                if (sub.type === 'math-inline') {
                  return (
                    <span
                      key={subIdx}
                      dangerouslySetInnerHTML={{ __html: renderKatex(sub.content, false) }}
                      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 1px' }}
                    />
                  );
                }
                if (sub.type === 'math-block') {
                  return (
                    <span
                      key={subIdx}
                      dangerouslySetInnerHTML={{ __html: renderKatex(sub.content, true) }}
                      style={{ display: 'block', margin: '10px 0', textAlign: 'center' }}
                    />
                  );
                }
                return <span key={subIdx}>{sub.content}</span>;
              })}
            </span>
          );
        }

        return <span key={idx}>{processed}</span>;
      })}
    </span>
  );
}
