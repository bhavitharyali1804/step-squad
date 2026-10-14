import { createClient } from '@supabase/supabase-js';
import './style.css';

const members = ['Mini', 'Bunny', 'Honey', 'Chinnu'];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const app = document.querySelector('#app');

const localDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDate = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

let todayRows = [];

function shell() {
  app.innerHTML = `
    <main class="container">
      <section class="hero">
        <div>
          <div class="eyebrow">STEP SQUAD</div>
          <h1>Who walked the most today?</h1>
          <p>Four friends. One daily challenge. Highest steps wins.</p>
        </div>
        <div class="date-pill" id="date-pill"></div>
      </section>

      <section class="card">
        <div class="section-head">
          <div>
            <h2>Today's steps</h2>
            <p id="status">Loading...</p>
          </div>
          <button id="save" class="primary">Save steps</button>
        </div>
        <div id="entries" class="entries"></div>
      </section>

      <section class="grid-two">
        <div class="card">
          <div class="section-head">
            <div>
              <h2>Today's result</h2>
              <p>Winner is calculated from all four entries.</p>
            </div>
          </div>
          <div id="winner"></div>
        </div>

        <div class="card">
          <div class="section-head">
            <div>
              <h2>Wins leaderboard</h2>
              <p>Completed days only.</p>
            </div>
          </div>
          <div id="leaderboard"></div>
        </div>
      </section>

      <section class="card">
        <div class="section-head">
          <div>
            <h2>Recent days</h2>
            <p>Your shared squad history.</p>
          </div>
        </div>
        <div id="history"></div>
      </section>

      <footer>Step Squad • Mini • Bunny • Honey • Chinnu</footer>
    </main>
  `;

  document.querySelector('#date-pill').textContent = formatDate(localDate());

  const entries = document.querySelector('#entries');
  entries.innerHTML = members.map((member) => `
    <label class="entry">
      <span class="member">${member}</span>
      <input type="number" min="0" max="100000" step="1" id="steps-${member}" placeholder="0" inputmode="numeric" />
      <span class="unit">steps</span>
    </label>
  `).join('');

  document.querySelector('#save').addEventListener('click', saveToday);
}

function setStatus(message, kind = '') {
  const el = document.querySelector('#status');
  el.textContent = message;
  el.className = kind;
}

function renderToday() {
  const winnerEl = document.querySelector('#winner');

  const byMember = Object.fromEntries(todayRows.map((r) => [r.member, r.steps]));
  members.forEach((member) => {
    const input = document.querySelector(`#steps-${member}`);
    if (input && byMember[member] !== undefined) input.value = byMember[member];
  });

  if (!todayRows.length) {
    winnerEl.innerHTML = `<div class="empty">Enter all four members' steps to see the winner.</div>`;
    return;
  }

  const values = members.map((m) => ({ member: m, steps: Number(byMember[m] ?? 0) }));
  const max = Math.max(...values.map((x) => x.steps));
  const leaders = values.filter((x) => x.steps === max && byMember[x.member] !== undefined);

  if (todayRows.length < 4) {
    winnerEl.innerHTML = `
      <div class="progress-result">
        <strong>${todayRows.length}/4 entries</strong>
        <span>Waiting for everyone to enter their steps.</span>
      </div>`;
    return;
  }

  if (leaders.length > 1) {
    winnerEl.innerHTML = `
      <div class="tie">
        <span class="trophy">🤝</span>
        <strong>It's a tie!</strong>
        <span>${leaders.map((x) => x.member).join(' & ')} — ${max.toLocaleString()} steps</span>
      </div>`;
    return;
  }

  winnerEl.innerHTML = `
    <div class="winner">
      <span class="trophy">🏆</span>
      <div>
        <span class="small">TODAY'S WINNER</span>
        <strong>${leaders[0].member}</strong>
        <span>${max.toLocaleString()} steps</span>
      </div>
    </div>`;
}

async function loadToday() {
  if (!supabase) {
    setStatus('Database is not connected. Add the Supabase environment variables.', 'error');
    renderToday();
    return;
  }

  const { data, error } = await supabase
    .from('daily_steps')
    .select('day, member, steps')
    .eq('day', localDate());

  if (error) {
    setStatus(`Could not load today's steps: ${error.message}`, 'error');
    return;
  }

  todayRows = data ?? [];
  setStatus(todayRows.length === 4 ? 'All four entries are saved.' : `${todayRows.length}/4 entries saved.`);
  renderToday();
}

async function saveToday() {
  if (!supabase) {
    setStatus('Connect Supabase first.', 'error');
    return;
  }

  const rows = [];
  for (const member of members) {
    const raw = document.querySelector(`#steps-${member}`).value.trim();
    if (raw === '') {
      setStatus(`${member} still needs a step count.`, 'error');
      return;
    }
    const steps = Number(raw);
    if (!Number.isInteger(steps) || steps < 0 || steps > 100000) {
      setStatus(`${member}'s steps must be a whole number from 0 to 100,000.`, 'error');
      return;
    }
    rows.push({ day: localDate(), member, steps });
  }

  const { error } = await supabase
    .from('daily_steps')
    .upsert(rows, { onConflict: 'day,member' });

  if (error) {
    setStatus(`Save failed: ${error.message}`, 'error');
    return;
  }

  setStatus('Saved for the whole squad ✓', 'success');
  await loadToday();
  await loadLeaderboard();
  await loadHistory();
}

async function loadLeaderboard() {
  const el = document.querySelector('#leaderboard');

  if (!supabase) {
    el.innerHTML = `<div class="empty">Connect the database to see the leaderboard.</div>`;
    return;
  }

  const { data, error } = await supabase
    .from('daily_steps')
    .select('day, member, steps')
    .order('day', { ascending: false });

  if (error) {
    el.innerHTML = `<div class="empty">Could not load leaderboard.</div>`;
    return;
  }

  const byDay = {};
  for (const row of data ?? []) {
    (byDay[row.day] ??= []).push(row);
  }

  const wins = Object.fromEntries(members.map((m) => [m, 0]));

  for (const rows of Object.values(byDay)) {
    if (rows.length !== 4) continue;
    const max = Math.max(...rows.map((r) => r.steps));
    const leaders = rows.filter((r) => r.steps === max);
    if (leaders.length === 1) wins[leaders[0].member]++;
  }

  const ranking = members
    .map((member) => ({ member, wins: wins[member] }))
    .sort((a, b) => b.wins - a.wins || members.indexOf(a.member) - members.indexOf(b.member));

  el.innerHTML = ranking.map((item, index) => `
    <div class="rank-row">
      <span class="rank">${index + 1}</span>
      <span class="rank-name">${item.member}</span>
      <strong>${item.wins}</strong>
      <span class="wins-label">${item.wins === 1 ? 'win' : 'wins'}</span>
    </div>
  `).join('');
}

async function loadHistory() {
  const el = document.querySelector('#history');

  if (!supabase) {
    el.innerHTML = `<div class="empty">Connect the database to see history.</div>`;
    return;
  }

  const { data, error } = await supabase
    .from('daily_steps')
    .select('day, member, steps')
    .order('day', { ascending: false });

  if (error) {
    el.innerHTML = `<div class="empty">Could not load history.</div>`;
    return;
  }

  const byDay = {};
  for (const row of data ?? []) {
    (byDay[row.day] ??= []).push(row);
  }

  const days = Object.keys(byDay).slice(0, 10);

  if (!days.length) {
    el.innerHTML = `<div class="empty">No history yet.</div>`;
    return;
  }

  el.innerHTML = days.map((day) => {
    const rows = byDay[day];
    const max = rows.length === 4 ? Math.max(...rows.map((r) => r.steps)) : null;
    const winners = max === null ? [] : rows.filter((r) => r.steps === max).map((r) => r.member);

    return `
      <div class="history-row">
        <div>
          <strong>${formatDate(day)}</strong>
          <span>${rows.length}/4 entries</span>
        </div>
        <div class="history-result">
          ${winners.length === 1
            ? `🏆 ${winners[0]} · ${max.toLocaleString()}`
            : winners.length > 1
              ? `🤝 Tie · ${max.toLocaleString()}`
              : 'In progress'}
        </div>
      </div>
    `;
  }).join('');
}

shell();
loadToday();
loadLeaderboard();
loadHistory();
