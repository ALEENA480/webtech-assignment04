const KEY = 'mdslides:v1';
const SAMPLE = `# Welcome
## Markdown Slides
Write slides on the left, see them on the right.
---
# Slide 02
## Features
- Create and edit slides
- Save in the browser
- Present full screen
---
# Slide 03
## Try it
Use **bold**, *italic* and \`code\` in your slides.

> Press ← and → to move between slides.
`;
const $ = id => document.getElementById(id);
const editor = $('editor'), slideEl = $('slide'), pane = $('pane');
let slides = [], cur = 0;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\*(.+?)\*/g, '<i>$1</i>')
  .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

function md(src) {
  const out = []; let list = null, fence = false, code = [];
  const close = () => { if (list) { out.push('</' + list + '>'); list = null; } };
  for (const line of src.split('\n')) {
    if (/^```/.test(line)) {
      if (fence) { out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); code = []; }
      else close();
      fence = !fence; continue;
    }
    if (fence) { code.push(line); continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)/))) { close(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); }
    else if ((m = line.match(/^\s*[-*+]\s+(.*)/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); }
    else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); }
    else if ((m = line.match(/^>\s?(.*)/))) { close(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>'); }
    else if (line.trim()) { close(); out.push('<p>' + inline(line) + '</p>'); }
    else close();
  }
  close();
  if (fence) out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
  return out.join('\n');
}

function parse() {
  slides = editor.value.split(/^[ \t]*---[ \t]*$/m).map(s => s.trim()).filter(Boolean);
  if (!slides.length) slides = [''];
  if (cur > slides.length - 1) cur = slides.length - 1;
}

function render() {
  slideEl.innerHTML = md(slides[cur]) || '<p style="opacity:.5">Empty slide</p>';
  $('count').textContent = (cur + 1) + ' / ' + slides.length;
  $('prev').disabled = cur === 0;
  $('next').disabled = cur === slides.length - 1;
  const on = pane.classList.contains('presenting');
  $('fs').textContent = on ? '✕ Exit Full Screen' : '⛶ Full Screen';
  $('presentBtn').textContent = on ? 'Exit' : 'Present';
}

function go(d) {
  const n = cur + d;
  if (n < 0 || n >= slides.length) return;
  cur = n; render();
}

function setStatus(t) { $('status').textContent = t; }

function save() {
  try { localStorage.setItem(KEY, editor.value); setStatus('Saved ✓'); }
  catch (e) { setStatus('Could not save'); }
}

function load() {
  try { const v = localStorage.getItem(KEY); return v === null ? SAMPLE : v; }
  catch (e) { return SAMPLE; }
}

function togglePresent() {
  const on = !pane.classList.contains('presenting');
  pane.classList.toggle('presenting', on);
  if (on) { if (pane.requestFullscreen) pane.requestFullscreen().catch(() => {}); }
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  render();
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && pane.classList.contains('presenting')) { pane.classList.remove('presenting'); render(); }
});

editor.addEventListener('input', () => { parse(); render(); setStatus('Unsaved changes'); });
$('prev').onclick = () => go(-1);
$('next').onclick = () => go(1);
$('fs').onclick = togglePresent;
$('presentBtn').onclick = togglePresent;
$('saveBtn').onclick = save;
$('newBtn').onclick = () => {
  if (!confirm('Start a new presentation? Unsaved changes will be lost.')) return;
  editor.value = '# New slide\n\nStart typing…\n'; cur = 0; parse(); render(); setStatus('Unsaved changes');
};

document.addEventListener('keydown', e => {
  const presenting = pane.classList.contains('presenting');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
  if (e.key === 'F11') { e.preventDefault(); togglePresent(); return; }
  if (e.key === 'Escape' && presenting && !document.fullscreenElement) { togglePresent(); return; }
  if (e.target === editor && !presenting) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
});

editor.value = load();
parse(); render();
setStatus('Loaded');
