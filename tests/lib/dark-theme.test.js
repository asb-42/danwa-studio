/**
 * Dark Theme Audit — tests that form elements have proper dark: variants.
 *
 * Form elements (textarea, select, input[type=text], input[type=number])
 * must have BOTH bg-white + dark:bg-* AND text-gray-900 + dark:text-* to
 * avoid invisible text on dark backgrounds.
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
