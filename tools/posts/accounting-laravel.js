// Post spec: the Laravel accounting app for the training centre.
//
// Claims traced to the accounting repository: Laravel 12 on PHP 8.2 with MySQL,
// Tailwind, PhpSpreadsheet, the books/journals/receivables/payables/inventory
// scope, and the beta status the resume states. The double-entry invariant,
// single write path and ledger-focused test suite are what the code itself
// demonstrates; the export-as-source-of-truth decision is the one design choice
// worth explaining.
//
// Length target: the existing posts run 318-394 prose words (code excluded).
module.exports = {
  slug: 'accounting-laravel',
  title: 'What Building an Accounting App in Laravel Taught Me',
  description:
    'Lessons from building a Laravel 12 accounting system on MySQL — why double-entry bookkeeping is harder than it looks, what PhpSpreadsheet taught me about exports, and why the test suite was the only part I did not want to cut.',
  ogDescription:
    'Double-entry bookkeeping, a balance invariant checked before every write, and a test suite aimed at the ledger instead of the UI.',
  date: '2026-08-12',
  category: 'Development',
  displayDate: 'August 12, 2026',
  readTime: 6,
  toc: [
    { id: 'why-accounting', text: 'Why Accounting Is Harder Than It Looks' },
    { id: 'double-entry', text: 'Getting Double-Entry Right' },
    { id: 'exports', text: 'Spreadsheet Exports Changed the Design' },
    { id: 'testing', text: 'The Part I Wanted to Cut' },
    { id: 'beta', text: 'Why This Is Still in Beta' },
    { id: 'whats-next', text: "What's Next", numbered: false },
  ],
  content: `            <h2 id="why-accounting">1. Why Accounting Is Harder Than It Looks</h2>

<p>My second system for the training centre is an accounting application, and it is the opposite problem to the queue system. That one had a single job and did it visibly. Accounting has no visible surface at all &mdash; books, journals, receivables, payables, inventory, reporting &mdash; and the only way to know it works is whether the numbers are right.</p>

<blockquote>An app that displays numbers is easy. An app where the numbers agree with each other is the actual project.</blockquote>

<p>The instinct is to treat it like a CRUD app with extra steps: a form for invoices, a list for payments, a table for customers. You can build all of that in a weekend and every screen will work. What you cannot do in a weekend is make the totals mean something. Money has to go somewhere, and if a customer pays 5,000 against an invoice, the balance drops but no account goes up, so the books stop balancing.</p>

<p>The stack is Laravel 12 on PHP 8.2 with MySQL, Tailwind, and PhpSpreadsheet for exports.</p>

            <h2 id="double-entry">2. Getting Double-Entry Right</h2>

<p>The core idea is that every transaction has at least two sides. A sales invoice debits a receivable and credits revenue; a payment debits cash and credits that same receivable. For any journal entry the debits must equal the credits. Not approximately. Exactly.</p>

<p>Two things made that holdable: one place is responsible for writing an entry, and the check runs inside the write rather than in a nightly job, so if the sides do not balance, the entry never reaches the database.</p>

<pre><code>$debits  = $lines-&gt;where('direction', 'debit')-&gt;sum('amount');
$credits = $lines-&gt;where('direction', 'credit')-&gt;sum('amount');

if ($debits-&gt;neq($credits)) {
    throw new UnbalancedJournalException('Debits must equal credits');
}</code></pre>

<p>Decimals matter here. Floating point is wrong for money and wrong in unpredictable ways, so amounts are decimal columns rather than floats.</p>

            <h2 id="exports">3. Spreadsheet Exports Changed the Design</h2>

<p>The requirement that reshaped the app was not a screen. Users wanted a report they could open in a spreadsheet, in the layout the accountant already knew. PhpSpreadsheet handles that, and it forced a decision about where formatting lives: formatting inside the export means the on-screen report and the file drift apart. So the export became the source of truth for column order and headings.</p>

            <h2 id="testing">4. The Part I Wanted to Cut</h2>

<p>Every test targets the ledger: a balanced journal saves, an unbalanced one is rejected, a payment updates the receivable, period totals match the sum of their entries. The UI has almost nothing. That is backwards from how I started. On the queue system my instinct was to get something visible working quickly; here, an untested balance check is not a missing feature, it is a wrong number that somebody trusts.</p>

<pre><code>it('rejects a journal whose sides do not balance', function () {
    // 1000 debit against 999.99 credit
    expect(fn () =&gt; $this-&gt;postJournal($entry))
        -&gt;toThrow(UnbalancedJournalException::class);
});</code></pre>

<p>There is a MySQL-specific PHPUnit config in the repo, because these queries behave differently against SQLite than against the database the app actually runs on.</p>

            <h2 id="beta">5. Why This Is Still in Beta</h2>

<p>It covers books, journals, receivables, payables, inventory and reporting. That is enough to be useful without being something I would call finished, so my resume says in beta and I am keeping that word. Neither it nor the queue system is running in production.</p>

            <h2 id="whats-next">What's Next</h2>

<p>Closing the gap between the on-screen report and the export. Then an audit trail: who posted which journal, and when. If I rebuilt it, I would write the balance assertion first instead of fifth.</p>

<pre><code>github.com/Gl3nnnn/accounting</code></pre>`,
};
