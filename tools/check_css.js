// Checks that every inline <style> block in the site still parses as CSS.
//
// This exists because of a real, silent failure. Commit f100630 injected a
// JSON-LD block into index.html's <style> 13 times, each injection replacing a
// pair of closing braces with a stray top-level `}`. Nothing about that looks
// broken in a diff - the braces still balance, and the file still renders - but
// a stray `}` is not a no-op in CSS:
//
//   A top-level `}` does not close anything. The parser is reading a list of
//   rules, so it treats the `}` as the start of a selector prelude, keeps
//   consuming tokens until it hits the next `{`, and then consumes THAT block as
//   the rule's block. An at-rule caught this way is silently discarded, and so
//   are any plain rules in between.
//
// Measured in Chrome on the damaged file: 303 rules parsed, @keyframes word and
// @keyframes typing missing, and 6 of 13 responsive breakpoints gone. The
// visible symptom was the hero sub-headline sitting frozen on "IT Assistant",
// because the @keyframes that drives its `content` had been thrown away.
//
// So the checks here are the two things that failure mode always breaks:
//   1. no `}` at nesting depth 0
//   2. braces balance, and every block that opens is closed
// Plus a direct look for the signature of that specific accident - JSON-LD text
// inside a <style> block - and a JSON.parse of every ld+json block, since
// malformed structured data is dropped by search engines without an error.
//
// A third brace case has since turned up in this file, and it is the mirror image
// of bug 1: a stray `{` at depth 0 with nothing in front of it. Same mechanism -
// the parser consumes tokens until it finds a block, then swallows that block -
// and here it deleted six rules in index.html while the braces still balanced and
// check_css.js still passed, because it only tested one direction. So `strayOpen`
// below reports a depth-0 `{` whose prelude is empty, which is the only way a
// brace can be both at depth 0 and have no selector.
//
// No dependencies, matching the rest of tools/. Run: node tools/check_css.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function htmlFiles() {
  return fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.html'))
    .sort();
}

// Pull the body out of every <style> element. Non-greedy, so a page with more
// than one yields one entry per block.
function styleBlocks(html) {
  const out = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ css: m[1], index: m.index });
  }
  return out;
}

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

// Walks the CSS once, tracking brace depth, and reports the top-level at-rules.
//
// Comments and strings are blanked first so that braces inside them - which are
// extremely common, e.g. content: "}" or a data: URI - are not counted.
function parseCss(css) {
  const src = css
    .replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length))
    .replace(/"(?:[^"\\]|\\.)*"/g, m => '~'.repeat(m.length))
    .replace(/'(?:[^'\\]|\\.)*'/g, m => '~'.repeat(m.length));

  const atRules = [];
  const strayClose = [];
  const strayOpen = [];
  let depth = 0;
  let unclosed = null;
  let i = 0;
  // Start of the current top-level selector prelude, so a depth-0 `{` can be told
  // apart from a legitimate rule's opening brace.
  let preludeStart = 0;

  while (i < src.length) {
    const c = src[i];

    if (c === '{') {
      if (depth === 0 && src.slice(preludeStart, i).trim() === '') {
        // Depth 0 and nothing but whitespace since the last `}` or start of input
        // means this brace opens a block with no selector in front of it.
        strayOpen.push(lineOf(css, i));
      }
      depth++;
      i++;
      continue;
    }

    if (c === '}') {
      // depth === 0 here is the bug this tool exists to catch.
      if (depth === 0) strayClose.push(lineOf(css, i));
      else depth--;
      // The next top-level `{` belongs to whatever prelude starts after this `}`.
      preludeStart = i + 1;
      i++;
      continue;
    }

    if (c === '@' && depth === 0) {
      const m = /^@([A-Za-z-]+)/.exec(src.slice(i, i + 24));
      if (m) {
        atRules.push({ name: m[1].toLowerCase(), line: lineOf(css, i) });
        i += m[1].length + 1;
        continue;
      }
    }

    i++;
  }

  // A positive depth means an opening brace was never closed. The opening line
  // is found by re-walking, so the message can point at it.
  if (depth > 0) {
    let d = 0;
    let line = 1;
    for (let j = 0; j < src.length; j++) {
      if (src[j] === '{') { if (d === 0) line = lineOf(css, j); d++; }
      else if (src[j] === '}') d--;
    }
    unclosed = line;
  }

  return { atRules, strayClose, strayOpen, unclosed };
}

let failures = 0;

function fail(file, message) {
  failures++;
  console.log('FAIL ' + file + ': ' + message);
}

for (const file of htmlFiles()) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');

  // The exact signature of the f100630 accident: structured-data text that ended
  // up inside a stylesheet. Never legitimate.
  const blocks = styleBlocks(html);
  blocks.forEach((block, n) => {
    const label = file + ' <style> #' + (n + 1);
    if (/"@(?:context|type)"/.test(block.css)) {
      fail(label, 'contains JSON-LD text inside a <style> block');
    }

    const { atRules, strayClose, strayOpen, unclosed } = parseCss(block.css);

    const problems = [];
    if (strayClose.length) {
      problems.push('stray "}" at top level on CSS line(s) ' + strayClose.join(', ') +
        ' - this silently deletes the at-rule that follows it');
    }
    if (strayOpen.length) {
      problems.push('stray "{" at top level on CSS line(s) ' + strayOpen.join(', ') +
        ' - a brace with no selector swallows every rule up to its matching "}"');
    }
    if (unclosed !== null) {
      problems.push('unclosed "{" opened on CSS line ' + unclosed);
    }

    // A failed block is not also summarised as ok. The counts below come from
    // brace counting, which cannot see the damage a stray brace does, so
    // printing "keyframes=5" next to a failure would be exactly the reassuring
    // output that let this go unnoticed.
    if (problems.length) {
      problems.forEach(p => fail(label, p));
      return;
    }

    const keyframes = atRules.filter(a => a.name === 'keyframes').length;
    const media = atRules.filter(a => a.name === 'media').length;
    console.log('ok   ' + label + '  keyframes=' + (keyframes || 'none') +
      ' media=' + media + '  balanced');
  });

  // Malformed JSON-LD is ignored by search engines rather than reported, so it
  // is worth a hard failure here.
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ld.exec(html)) !== null) {
    try {
      JSON.parse(m[1]);
    } catch (err) {
      fail(file, 'invalid JSON in a ld+json block: ' + err.message);
    }
  }
}

if (failures) {
  console.log('\n' + failures + ' problem(s) found.');
  process.exit(1);
}
console.log('\nAll inline CSS parsed cleanly.');
