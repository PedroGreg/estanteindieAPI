import { api, auth, onRateLimit } from './api.js';
import { esc, toast, confirmDialog } from './ui.js';
import { renderHome } from './pages/home.js';
import { renderGames, renderGameDetail } from './pages/games.js';
import { renderEntities } from './pages/entities.js';
import { renderUsers } from './pages/users.js';
import { renderProfiles } from './pages/profiles.js';
import { renderAccount } from './pages/account.js';

const view = document.getElementById('view');
let navigationId = 0;

const routes = [
    { pattern: /^\/?$/, nav: 'home', title: 'Início', render: renderHome },
    { pattern: /^\/games\/(\d+)$/, nav: 'games', title: 'Game', render: (root, ctx) => renderGameDetail(root, ctx, Number(ctx.match[1])) },
    { pattern: /^\/games$/, nav: 'games', title: 'Games', render: renderGames },
    { pattern: /^\/categorias$/, nav: 'categorias', title: 'Categorias', render: (root, ctx) => renderEntities(root, ctx, 'categorias') },
    { pattern: /^\/desenvolvedores$/, nav: 'desenvolvedores', title: 'Desenvolvedores', render: (root, ctx) => renderEntities(root, ctx, 'desenvolvedores') },
    { pattern: /^\/plataformas$/, nav: 'plataformas', title: 'Plataformas', render: (root, ctx) => renderEntities(root, ctx, 'plataformas') },
    { pattern: /^\/usuarios$/, nav: 'usuarios', title: 'Usuários', render: renderUsers, hidden: true },
    { pattern: /^\/perfis$/, nav: 'perfis', title: 'Perfis', render: renderProfiles, hidden: true },
    { pattern: /^\/conta$/, nav: 'conta', title: 'Minha conta', render: renderAccount }
];

function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, search = ''] = raw.split('?');
    return { path, params: new URLSearchParams(search) };
}

export function navigate(path, params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    const text = search.toString();
    const target = `#${path}${text ? `?${text}` : ''}`;
    if (location.hash === target) {
        render();
    } else {
        location.hash = target;
    }
}

function setActiveNav(name) {
    document.querySelectorAll('[data-nav]').forEach(link => {
        const active = link.dataset.nav === name;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
}

async function render() {
    const { path, params } = parseHash();
    const route = routes.find(item => item.pattern.test(path));
    const currentId = ++navigationId;
    document.body.classList.remove('nav-open');

    if (!route || route.hidden) {
        setActiveNav('');
        document.title = 'Página não encontrada · Indie Games';
        view.innerHTML = `<section class="page"><div class="state"><p class="state-title">Página não encontrada</p>
            <p>O endereço <code>${esc(path)}</code> não existe.</p><a class="btn btn-primary" href="#/">Voltar ao início</a></div></section>`;
        return;
    }

    setActiveNav(route.nav);
    document.title = `${route.title} · Indie Games`;
    const ctx = {
        params,
        match: path.match(route.pattern),
        isCurrent: () => currentId === navigationId,
        navigate,
        refresh: render
    };
    view.scrollTop = 0;
    window.scrollTo({ top: 0 });
    await route.render(view, ctx);
    view.focus({ preventScroll: true });
}

function renderAuthArea() {
    const area = document.getElementById('auth-area');
    if (auth.isLogged()) {
        const user = auth.user || {};
        area.innerHTML = `
            <a class="auth-chip" href="#/conta" title="Minha conta">
                <span class="auth-dot" aria-hidden="true"></span>
                <span class="auth-name">${esc(user.name || 'Minha conta')}</span>
            </a>
            <button class="btn btn-ghost btn-sm" data-logout>Sair</button>`;
        area.querySelector('[data-logout]').addEventListener('click', async () => {
            const ok = await confirmDialog({ title: 'Sair', message: 'Deseja sair? A sua chave de acesso será invalidada.', confirmLabel: 'Sair' });
            if (!ok) return;
            await api.logout().catch(() => {});
            toast('Você saiu da sua conta.', 'info');
            if (parseHash().path === '/conta') render();
        });
    } else {
        area.innerHTML = `<a class="btn btn-primary btn-sm" href="#/conta">Entrar</a>`;
    }
}

let rateTimer;
function showRateLimit(seconds) {
    const banner = document.getElementById('rate-banner');
    let remaining = seconds;
    clearInterval(rateTimer);
    const update = () => {
        banner.innerHTML = `<strong>Limite de requisições atingido.</strong> A API aceita 20 requisições por minuto. Tente novamente em <strong>${remaining}s</strong>.`;
    };
    update();
    banner.hidden = false;
    rateTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(rateTimer);
            banner.hidden = true;
            return;
        }
        update();
    }, 1000);
}

document.getElementById('nav-toggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', String(open));
});

auth.onChange(renderAuthArea);
onRateLimit(showRateLimit);
window.addEventListener('hashchange', render);
renderAuthArea();
render();
