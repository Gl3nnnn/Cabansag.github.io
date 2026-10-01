// Post spec: building the COMPASS training centre queue system.
//
// Every factual claim traces to the counter_compass repository. The stack line,
// the three service codes, the six counters, the ticket schema and the eight
// outstanding security items are all read from that repo's own README. Nothing
// here claims the system is deployed - the README lists authentication and
// deployment hardening as outstanding, and the resume describes it as built
// rather than live.
//
// Length target: the existing posts run 318-394 prose words (code excluded), so
// this is written to land near the top of that range rather than above it.
module.exports = {
  slug: 'queue-system',
  title: 'Building a Queue System for a Training Centre Counter',
  description:
    'How the COMPASS training centre front counter went from a paper list to a real-time queue system — three services, independent ticket numbering, and the eight security items still outstanding before it can go live.',
  ogDescription:
    'Paper list to real-time queue: three services, independent ticket numbering, Socket.io updates, and what still blocks production.',
  date: '2026-09-15',
  category: 'Development',
  displayDate: 'September 15, 2026',
  readTime: 7,
  // prev/next are owned by tools/posts/_chain.js and ignored here.
  toc: [
    { id: 'the-problem', text: 'The Problem With a Paper List' },
    { id: 'three-services', text: 'Three Services, Three Separate Queues' },
    { id: 'ticket-numbers', text: 'Ticket Numbers That Reset Themselves' },
    { id: 'pushing-updates', text: 'Getting the Display Screen to Update Itself' },
    { id: 'not-finished', text: 'What Is Not Finished Yet' },
    { id: 'whats-next', text: "What's Next", numbered: false },
  ],
  content: `            <h2 id="the-problem">1. The Problem With a Paper List</h2>

<p>The front counter at COMPASS Training Centre has three services: registration, document processing, and inquiries. Names went on a paper sheet, by hand, every day. I wanted to build the thing that replaces the sheet.</p>

<p>A visitor picks a service, gets a number, and is called. Staff work six counters, and the three queues share one waiting area. A number means nothing on its own: someone asking about fees should not take the next registration number.</p>

            <h2 id="three-services">2. Three Services, Three Separate Queues</h2>

<p>Which makes the service table the root of the schema:</p>

<pre><code>id        INT PRIMARY KEY
name      VARCHAR(100)
code      VARCHAR(10) UNIQUE</code></pre>

<p>Three rows: Registration, Documents, Inquiry. Each points at its own counters, and the short codes end up inside the ticket number, so &ldquo;CMP-REG-001&rdquo; says which queue it belongs to in a noisy room.</p>

            <h2 id="ticket-numbers">3. Ticket Numbers That Reset Themselves</h2>

<p>Numbering is per service, per day, starting at 001, with no scheduled job doing it. A ticket from yesterday simply does not match today&rsquo;s filter, so it is invisible and the next insert starts at 001 again:</p>

<pre><code>-- the "is it from today" test, used everywhere a ticket is read
WHERE DATE(created_at) = CURDATE()</code></pre>

<p>Daily totals fall out of the same query, with no separate counter table that can drift.</p>

<p>The ticket table carries four things worth naming. <code>counter_id</code> is nullable, because a waiting ticket is not assigned to anyone yet. <code>status</code> is an enum, because &ldquo;skipped&rdquo; is a real state and not a cancel &mdash; a skipped person goes back in the queue. And separate <code>called_at</code> and <code>completed_at</code> let the display separate waiting time from service time.</p>

            <h2 id="pushing-updates">4. Getting the Display Screen to Update Itself</h2>

<p>Refreshing every few seconds works, and it is what I started with. It is wrong for a screen on a wall: visible flicker, and a request every two seconds forever. Socket.io holds the connection open and pushes an event when something changes:</p>

<pre><code>io.emit('ticket-called', { ticketNumber, serviceCode, counterName });

socket.on('ticket-called', (data) =&gt; setNowServing(data));</code></pre>

<p>The counter panel calls <code>/api/tickets/call-next</code>, which finds the lowest waiting ticket for that counter&rsquo;s service, flips it to <code>serving</code>, stamps <code>called_at</code>, and emits. The screen updates because it was told to, not because it asked.</p>

<p>One thing I would do differently: I built the display screen last, and it should have been first. It is what everyone actually sees.</p>

<blockquote>The moment the display stopped being the staff member&rsquo;s responsibility was the moment this was worth building.</blockquote>

            <h2 id="not-finished">5. What Is Not Finished Yet</h2>

<p>This is the part I would rather write down than leave out. The system is not production-ready, and my own README says so in a list of eight items I have not done.</p>

<p>The staff panel logs in with a shared default password. Beyond that: no real authentication, no role-based access control, no HTTPS, no rate limiting, no input validation on the API, secrets in <code>.env</code> rather than a secret store, and no backup plan.</p>

<p>That shared password is the item I would fix first, because it is the one where the current state is worse than having no login at all. My resume describes this as built, not deployed, which is deliberate.</p>

            <h2 id="whats-next">What's Next</h2>

<p>Then real authentication and HTTPS, then backups.</p>

<pre><code>github.com/Gl3nnnn/counter_compass</code></pre>`,
};
