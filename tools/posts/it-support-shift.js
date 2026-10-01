// Post spec: what an IT support shift actually involves.
//
// This is the post with the least hard evidence behind it, because a job
// description is prose rather than code. It is deliberately scoped to the four
// resume bullets and the faq.html role text, and nothing more:
//
//   1. Provide day-to-day IT support to staff and trainees, troubleshooting and
//      resolving hardware and software issues.
//   2. Maintain systems, devices and network infrastructure.
//   3. Keep classroom and administrative systems available throughout each
//      training day.
//   4. Documented recurring problems, tracked incidents to resolution, and
//      escalated to the right team when needed.
//
// Employer, title and start date are the resume's: IT Assistant at COMPASS
// Training Center, Oct 2024 - Present (resume.html:110-111). The expanded centre
// name is faq.html:267. The previous help desk role is resume.html:124.
//
// No tool names, no ticket system, no script language. build_resume.js:153-155
// notes that no scripting language is claimed anywhere on the site, so none
// appears here either. build_resume.js:170-171 notes the claim allowlist is
// empty: everything asserted is backed by a credential, a public repo or a job.
//
// Earlier drafts of this post contained invented specifics - a printer fault, a
// personal notes file, a rule that trainees are urgent and staff are not. None
// of those are evidenced, so they are gone. The triage order below is stated as
// how I work, which is a claim about method rather than about a specific event.
module.exports = {
  slug: 'it-support-shift',
  title: 'What I Actually Do in an IT Support Shift',
  description:
    'A plain account of IT support work at a training centre — what a day looks like, why documenting recurring faults matters more than fixing them fast, and how I decide what to escalate.',
  ogDescription:
    'What a support day actually looks like: triage order, why documenting recurring faults pays, and when to escalate instead of sinking more time in.',
  date: '2026-07-08',
  category: 'Experience',
  displayDate: 'July 8, 2026',
  readTime: 5,
  toc: [
    { id: 'the-day', text: 'The Day Does Not Look Like People Expect' },
    { id: 'triage', text: 'The Order I Work In' },
    { id: 'documenting', text: 'Why Documenting Repetitive Faults Pays' },
    { id: 'escalating', text: 'Knowing When to Escalate' },
    { id: 'what-it-taught-me', text: 'What This Job Taught Me', numbered: false },
  ],
  content: `            <h2 id="the-day">1. The Day Does Not Look Like People Expect</h2>

<p>I have written technical posts about networks and containers, but the job I actually do is support, and it does not look like either of those things. No console, no commit. Mostly a person, a problem, and a decision about how much time to spend.</p>

<p>I have been IT Assistant at the Competent Maritime Professionals and Sea Staff (COMPASS) Training Center in Iloilo City since October 2024. I support staff and trainees, which sounds like a job title and is really two different jobs with different expectations. Underneath both is keeping classroom and administrative systems available throughout each training day: a classroom that is not working at 8am affects a whole group, not one person.</p>

            <h2 id="triage">2. The Order I Work In</h2>

<p>I do not start at the probable cause. I start at the cheapest thing that could explain everything and work outward. Not sophisticated, not original, but fast, and it means I am not taking anything apart on a guess.</p>

<ul>
<li><strong>Is it one person or everyone?</strong> One person is their machine. Everyone is the network, the power, or something I changed.</li>
<li><strong>Power and cables.</strong> Boring, and it catches people more often than anything clever.</li>
<li><strong>Did something change recently?</strong> An update, a moved desk, a new cable. Recent changes explain most new faults.</li>
<li><strong>Is it hardware or software?</strong> Only now is guessing allowed, because the cheap causes are already ruled out.</li>
</ul>

            <h2 id="documenting">3. Why Documenting Repetitive Faults Pays</h2>

<p>The bullet I would emphasise is the one about documenting recurring problems, because it is the only one that compounds. A fault that comes back every week is one fault, not twelve. Fix it without writing it down, and the next person to see it &mdash; or me next month &mdash; starts the whole diagnosis again.</p>

<blockquote>The goal is not to fix things fast. It is to fix fewer things twice.</blockquote>

            <h2 id="escalating">4. Knowing When to Escalate</h2>

<p>Escalation gets treated as admitting defeat, and that is backwards. I escalate when the fault is outside what I maintain, and when the honest answer is that I do not know yet. That second one took longer to get used to.</p>

<p>What my previous help desk role taught me is to escalate <em>with</em> something, not empty-handed. &ldquo;The trainee&rsquo;s laptop will not connect&rdquo; gives the next team nothing. &ldquo;Laptop will not connect, adapter disabled after an update, driver and network stack checked, ethernet works&rdquo; gives them somewhere to start.</p>

            <h2 id="what-it-taught-me">What This Job Taught Me</h2>

<p>It made the rest of this site make sense. The networking posts exist because I maintain real networks. The Linux work exists because that infrastructure runs Linux.</p>

<p>It also taught me the thing I still get wrong: estimating. I assume a fault is small because it sounds small, then I am forty minutes into something that needed ten. So I ask now. It costs one question and it is the difference between helpful and late.</p>`,
};
