// Stamps the homepage's "Last updated" date from git history.
//
// It was a hand-typed literal in index.html and read 2026-10-01 while the page
// had been edited three times since. Nothing on the site can tell a visitor
// when the homepage actually changed, and a literal cannot: it survives every
// edit after it was typed, so it is stale from the moment it is written and
// looks correct the entire time.
//
// This is a generator like build_post.js and build_resume.js, so the repo's
// existing CI gate covers it - the workflow regenerates every generator and
// fails if the tree changed, which means a forgotten stamp fails the build
// instead of quietly lying on the page.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'index.html');

// What the homepage is actually made of. script.js carries the theme switch,
// the project star counts and the nav toggle; profile.jpg is the portrait; the
// page's CSS and markup are inline in index.html. A commit that touches only
// something else - a blog post, resume.html, this file - is not a change to the
// homepage and must not move the date.
const SOURCES = ['index.html', 'script.js', 'profile.jpg'];

const MARKER = 'class="last-updated"';
const STAMP = /(<p class="last-updated">Last updated: )(\d{4}-\d{2}-\d{2})(<\/p>)/;

function git(args) {
  // -C ROOT so this works from any cwd, and no shell: the arguments are fixed,
  // but there is no reason to hand them to one.
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
}

// A commit whose only change to the site was rewriting the stamp did not change
// the page, so it cannot be the date.
//
// Without this the generator would stamp itself. The stamp lives in index.html,
// so stamping is a change to index.html, so the next run would see that commit
// as the most recent edit and move the date to whenever the stamp was pushed -
// one commit later than the edit it is supposed to be reporting. Walk back over
// those and the date stays pinned to real content changes.
//
// The test is deliberately strict: exactly one file, that file being index.html,
// and every added or removed line carrying the marker. A commit that also edited
// something else counts as a content change even if the stamp moved with it.
function onlyRewroteStamp(sha) {
  const files = git(['show', '--name-only', '--format=', sha])
    .split('\n').map(s => s.trim()).filter(Boolean);
  if (files.length !== 1 || files[0].replace(/\\/g, '/') !== 'index.html') return false;
  const diff = git(['show', '--format=', '--unified=0', sha]);
  let touched = false;
  for (const line of diff.split('\n')) {
    if (!/^[+-]/.test(line) || line.startsWith('+++') || line.startsWith('---')) continue;
    touched = true;
    if (!line.includes(MARKER)) return false;
  }
  return touched;
}

function lastContentChange() {
  const shas = git(['log', '--format=%H', '--', ...SOURCES])
    .split('\n').map(s => s.trim()).filter(Boolean);
  if (!shas.length) {
    throw new Error(`no commits found for ${SOURCES.join(', ')} - is this a git checkout?`);
  }
  for (const sha of shas) if (!onlyRewroteStamp(sha)) return sha;
  // Every commit in reach only rewrote the stamp. On a full clone that is
  // impossible, so this is a shallow checkout: CI checks out with fetch-depth 1
  // by default and there is no older commit to walk back to. Better to fail
  // loudly here than to stamp the wrong date on every build.
  throw new Error(
    `every commit in reach only rewrote the stamp, and there is no earlier commit to ` +
    `fall back on - the history looks shallow. CI needs 'fetch-depth: 0' on its ` +
    `checkout step, and a local run needs a full clone (git fetch --unshallow).`
  );
}

const sha = lastContentChange();
const date = git(['show', '-s', '--format=%cs', sha]).trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  throw new Error(`commit ${sha} has no usable committer date (got ${JSON.stringify(date)})`);
}

const html = fs.readFileSync(TARGET, 'utf8');
if (!STAMP.test(html)) {
  throw new Error(
    'cannot find the "Last updated" paragraph in index.html. The markup changed; ' +
    're-pin the STAMP pattern in tools/build_last_updated.js. Refusing to guess, ' +
    'because guessing here means writing a date into an arbitrary line of the page.'
  );
}

const oldDate = STAMP.exec(html)[2];
if (oldDate === date) {
  console.log(`last updated: already ${date} (${sha.slice(0, 7)})`);
} else {
  fs.writeFileSync(TARGET, html.replace(STAMP, `$1${date}$3`));
  console.log(`last updated: ${oldDate} -> ${date} (${sha.slice(0, 7)})`);
}