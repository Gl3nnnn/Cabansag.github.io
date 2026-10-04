// Pre-commit half of the homepage's "Last updated" stamp.
//
// build_last_updated.js derives the date from the last commit that touched the
// homepage, and the stamp it writes lives inside index.html - one of those same
// sources. So the value depends on a commit that does not exist yet at the moment
// you would want to write it. Run the generator by hand and you get two commits:
// the edit, then the stamp. That is what CI's drift gate is for, but it is also
// why a forgotten stamp is a red build instead of a stale page.
//
// This removes the second commit. A pre-commit hook runs after git has staged
// your work but before it writes the commit, so the one thing still unknowable -
// the commit's own date - is knowable: it is now, to within the second. The hook
// writes today's date and stages it, so the content commit carries its own
// correct stamp and CI's regeneration finds nothing to do.
//
// The date comes from `git var GIT_COMMITTER_IDENT`, which holds the epoch and
// the zone offset git is about to record, rather than from `new Date()`. Those
// agree on a normal commit, but the generator later reads the *committed*
// timestamp, so taking git's own word for it removes a timezone and midnight
// boundary between what this writes and what CI checks.
//
// This is a convenience layer, not the guarantee. `--no-verify` skips it, and so
// does the partial-staging case below, and in both the drift gate still fails the
// push. Nothing here is allowed to block a commit; the hook's job is to make the
// right thing the easy thing, and CI's job is to be right when it is not easy.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const TARGET = 'index.html';

// The same list, and the same pattern, as build_last_updated.js. If either drifts
// the two tools will disagree about what the stamp means, so they are repeated
// rather than imported: build_last_updated.js is the one CI depends on and this
// one must not be able to break it at require time.
const SOURCES = ['index.html', 'script.js', 'profile.jpg'];
const MARKER = 'class="last-updated"';
const STAMP = /(<p class="last-updated">Last updated: )(\d{4}-\d{2}-\d{2})(<\/p>)/;

function git(args) {
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
}

function warn(msg) {
  process.stderr.write(`  [pre-commit] ${msg}\n`);
}

function todayAsGitWillRecordIt() {
  // "Name <email> <epoch> <+hhmm>" - the identity and timestamp for the commit
  // that is about to be made.
  const ident = git(['var', 'GIT_COMMITTER_IDENT']).trim();
  const m = ident.match(/ (\d+) ([+-]\d{2})(\d{2})$/);
  if (!m) throw new Error(`cannot read a committer timestamp out of ${JSON.stringify(ident)}`);
  const [, epoch, oh, om] = m;
  // Shift into the zone git itself reported, then read UTC fields. Going through
  // the reported offset rather than this process's local zone keeps the answer
  // right if the hook and the commit ever disagree about what "today" is.
  const local = new Date(Number(epoch) * 1000 + (Number(oh) * 60 + Number(om)) * 60000);
  return local.toISOString().slice(0, 10);
}

function bail(msg, detail) {
  warn(msg);
  if (detail) warn(detail);
  warn('not stamping. CI regenerates the stamp and will fail this push, which is');
  warn('loud rather than wrong - re-stage the whole file and try again.');
  process.exit(0);
}

let staged;
try {
  staged = git(['diff', '--cached', '--name-only']).split('\n').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean);
} catch (e) {
  // Nothing staged, or not a checkout. Either way there is no commit to help.
  process.exit(0);
}

if (!staged.some(f => SOURCES.includes(f))) process.exit(0);

// The stamp is written to the worktree file and staged back. If index.html's
// worktree copy is not identical to its staged copy, staging the result would
// also stage whatever else is in that file - the hunks from `git add -p` that
// were deliberately left out, or edits not meant for this commit at all. Refuse
// rather than sweep them in.
//
// Two distinct situations reach this guard and they are not the same mistake, so
// they get named separately: index.html partly staged, or index.html not staged
// at all while carrying edits. The second is easy to walk into by accident - edit
// the page, commit something else - and would silently drag a whole unsaved page
// into an unrelated commit.
const indexStaged = staged.includes(TARGET);
let indexDirty = true;
try {
  execFileSync('git', ['-C', ROOT, 'diff', '--quiet', '--', TARGET], { stdio: 'ignore' });
  indexDirty = false;
} catch { /* worktree and index differ */ }

if (indexDirty) {
  if (indexStaged) {
    bail(
      `${TARGET} is only partly staged`,
      'stamping would rewrite the file and drag the unstaged hunks into this commit'
    );
  } else {
    bail(
      `${TARGET} has unstaged edits and is not part of this commit`,
      'stamping would stage the whole file, including those edits'
    );
  }
}

const html = fs.readFileSync(path.join(ROOT, TARGET), 'utf8');
if (!STAMP.test(html)) {
  warn(`cannot find the "Last updated" paragraph in ${TARGET}.`);
  warn('the markup changed - re-pin the STAMP pattern in both this file and');
  warn('tools/build_last_updated.js. The stamp stays as it is; CI will say so too.');
  process.exit(0);
}

const oldDate = STAMP.exec(html)[2];
let date;
try {
  date = todayAsGitWillRecordIt();
} catch (e) {
  warn(`${e.message} - leaving the stamp alone. CI will catch it.`);
  process.exit(0);
}

if (oldDate === date) {
  warn(`already ${date}`);
  process.exit(0);
}

fs.writeFileSync(path.join(ROOT, TARGET), html.replace(STAMP, `$1${date}$3`));
execFileSync('git', ['-C', ROOT, 'add', '--', TARGET], { stdio: 'ignore' });
warn(`last updated: ${oldDate} -> ${date} (staged with your commit)`);
