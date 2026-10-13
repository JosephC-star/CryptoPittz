// Presentation enhancement only: game routes, wallet state and scoring stay in the game bundle.
const games = [
  ['rush', 'Quick play'], ['palace', 'Table games'], ['match', 'Quick play'],
  ['twentyone', 'Table games'], ['roulette', 'Table games'], ['plinko', 'Quick play'],
  ['pinball', 'Quick play'], ['crash', 'Quick play'], ['beat', 'Rhythm']
];
let category = 'All games';
function route() {
  const key = location.hash.split('/')[2];
  document.body.classList.toggle('ny-in-game', games.some(([game]) => game === key));
}
function decorate() {
  const lobby = document.querySelector('.arcade-lobby');
  if (!lobby) return;
  const cards = [...lobby.querySelectorAll('.arcade-cabinet')];
  if (cards.length !== games.length) return;
  cards.forEach((card, i) => {
    const [game, group] = games[i];
    card.dataset.yardGame = game;
    card.style.setProperty('--cabinet-art', `url('/images/playground/neon-${game}.webp')`);
    card.hidden = category !== 'All games' && category !== group;
  });
  if (!document.querySelector('.ny-filters')) {
    const template = document.querySelector('#ny-filter-template');
    lobby.before(template.content.cloneNode(true));
  }
  document.querySelectorAll('.ny-filters button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.category === category));
  });
}
window.addEventListener('hashchange', () => { route(); category = 'All games'; decorate(); });
document.addEventListener('click', event => {
  const filter = event.target.closest('[data-category]');
  if (filter) { category = filter.dataset.category; decorate(); }
  if (event.target.closest('[data-yard-browse]')) document.querySelector('.ny-filters')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});
// Child-list observation handles returning to the lobby without polling or rebuilding any games.
new MutationObserver(decorate).observe(document.querySelector('#root'), {childList:true, subtree:true});
route(); decorate();
