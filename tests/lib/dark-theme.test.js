/**
 * Dark Theme Audit — tests that form and table elements have proper dark: variants.
 *
 * Form elements (textarea, select, input[type=text], input[type=number])
 * must have BOTH bg-white + dark:bg-* AND text-gray-900 + dark:text-* to
 * avoid invisible text on dark backgrounds.
 *
 * Table elements (<td>, <th>) with text-gray-* must also have dark:text-*.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(import.meta.dirname, '../../src');

/** Recursively collect all .svelte files under dir */
function svelteFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...svelteFiles(full));
    else if (entry.endsWith('.svelte')) out.push(full);
  }
  return out;
}

/**
 * Find class="..." attributes on <textarea>, <select>, and <input> tags.
 * Returns [{ file, line, tag, classStr }]
 */
function findFormElements(source, filePath) {
  const results = [];
  const lines = source.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Match textarea/select/opening input tags (allow multiline class)
    const tagMatch = line.match(/<(textarea|select|input\b[^>]*?type=["'](?:text|number|password|email|search|url|tel)["'][^>]*?)\s/i);
    if (tagMatch) {
      // Collect the full tag (may span multiple lines)
      let tag = line;
      let tagLine = i;
      let depth = 0;
      while (!tag.match(/\/?>/) && i + 1 < lines.length) {
        i++;
        tag += ' ' + lines[i];
      }
      // Extract class="..." — handle both single and double quotes
      const classMatch = tag.match(/class="([^"]*)"/);
      if (classMatch) {
        results.push({
          file: relative(SRC, filePath),
          line: tagLine + 1,
          tag: tagMatch[1],
          classStr: classMatch[1],
        });
      }
    }
    i++;
  }
  return results;
}

describe('Dark theme — form elements must have dark: text and bg classes', () => {
  const files = svelteFiles(SRC);

  for (const filePath of files) {
    const rel = relative(SRC, filePath);
    // Skip test files and library files
    if (rel.includes('tests/') || rel.includes('test.') || rel.includes('.test.')) continue;

    it(`${rel} — form elements have dark:text`, () => {
      const source = readFileSync(filePath, 'utf-8');
      const elements = findFormElements(source, filePath);
      const issues = [];

      for (const { file, line, tag, classStr } of elements) {
        const classes = classStr.split(/\s+/);
        const hasBgWhite = classes.some(c => c === 'bg-white');
        const hasDarkBg = classes.some(c => c.startsWith('dark:bg-'));
        const hasTextDark = classes.some(c => c.startsWith('text-gray-900') || c === 'text-gray-800');
        const hasDarkText = classes.some(c => c.startsWith('dark:text-'));

        if (hasBgWhite && hasDarkBg && !hasDarkText) {
          issues.push(`  line ${line} <${tag}>: has bg-white + dark:bg-* but missing dark:text-*`);
        }
      }

      if (issues.length > 0) {
        throw new Error(
          `Dark theme issues in ${rel}:\n` +
          issues.join('\n') +
          '\n\nAll form elements with bg-white + dark:bg-* must also have text-gray-900 + dark:text-*'
        );
      }
    });
  }
});

/**
 * Find <td> and <th> elements with text-gray-* but missing dark:text-*.
 * These would be invisible in dark mode.
 */
function findTableElements(source, filePath) {
  const results = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tagMatch = line.match(/<(td|th)\b/i);
    if (!tagMatch) continue;

    // Collect full tag (may span lines)
    let tag = line;
    let tagLine = i;
    while (!tag.match(/\/?>/) && i + 1 < lines.length) {
      i++;
      tag += ' ' + lines[i];
    }

    const classMatch = tag.match(/class="([^"]*)"/);
    if (classMatch) {
      results.push({
        file: relative(SRC, filePath),
        line: tagLine + 1,
        tag: tagMatch[1].toLowerCase(),
        classStr: classMatch[1],
      });
    }
  }
  return results;
}

describe('Dark theme — table cells must have dark:text classes', () => {
  const files = svelteFiles(SRC);

  for (const filePath of files) {
    const rel = relative(SRC, filePath);
    if (rel.includes('tests/') || rel.includes('test.') || rel.includes('.test.')) continue;

    it(`${rel} — table cells have dark:text`, () => {
      const source = readFileSync(filePath, 'utf-8');
      const elements = findTableElements(source, filePath);
      const issues = [];

      for (const { file, line, tag, classStr } of elements) {
        const classes = classStr.split(/\s+/);
        // Check if it has any text-gray-* (light mode text color)
        const hasTextGray = classes.some(c => /^text-gray-\d+$/.test(c));
        // Check if it has dark:text-*
        const hasDarkText = classes.some(c => c.startsWith('dark:text-'));
        // Also check for text-gray-900 or text-gray-800 (common light mode dark text)
        const hasExplicitLightText = classes.some(c => c === 'text-gray-900' || c === 'text-gray-800');

        if (hasTextGray && !hasDarkText) {
          issues.push(`  line ${line} <${tag}>: has text-gray-* but missing dark:text-*`);
        }
        if (hasExplicitLightText && !hasDarkText) {
          issues.push(`  line ${line} <${tag}>: has text-gray-900/800 but missing dark:text-*`);
        }
      }

      if (issues.length > 0) {
        throw new Error(
          `Dark theme issues in ${rel}:\n` +
          issues.join('\n') +
          '\n\nAll table cells with text-gray-* must also have dark:text-*'
        );
      }
    });
  }
});
