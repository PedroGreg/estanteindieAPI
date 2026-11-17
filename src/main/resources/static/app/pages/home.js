import { api, items, pageInfo, lookup, query } from '../api.js';
import { esc, loading, emptyState, errorState } from '../ui.js';
import { gameCard } from './games.js';

export async function renderHome(root, ctx) {
    root.innerHTML = `<section class="page">
        <div class="card hero">
            <div>
                <h1>Seu catálogo de games indie</h1>
                <p>Explore games, descubra desenvolvedores e plataformas e ajude a montar o catálogo. Cadastrar é livre; para alterar ou excluir, basta entrar na sua conta.</p>
                <div class="hero-actions">
                    <a class="btn btn-primary" href="#/games">Explorar games</a>
                    <a class="btn btn-secondary" href="#/conta">Criar conta</a>
                </div>
            </div>
            <div class="hero-art"><img src="/img/logo.svg" alt=""></div>
        </div>

        <div class="grid grid-stats" data-stats>${['Games', 'Categorias', 'Desenvolvedores', 'Plataformas'].map(label =>
            `<div class="stat"><div class="stat-value">…</div><div class="stat-label">${label}</div></div>`).join('')}</div>

        <section>
            <div class="page-header" style="margin-bottom:14px">
                <h2 class="section-title" style="margin:0">Adicionados recentemente</h2>
                <a href="#/games?sort=createdAt,desc">Ver todos →</a>
            </div>
            <div data-recent>${loading('Carregando games...')}</div>
        </section>

        <section>
            <h2 class="section-title">Como funciona</h2>
            <div class="grid grid-3">
                <div class="tip tip-green"><h3>Cadastrar</h3><p>Qualquer pessoa pode cadastrar games, categorias, desenvolvedores e plataformas. Cada envio leva uma chave única, então clicar duas vezes não duplica nada.</p></div>
                <div class="tip tip-amber"><h3>Alterar e excluir</h3><p>Exigem login. Entre com a sua conta (ou com a de teste: admin@estanteindie.com / admin123).</p></div>
                <div class="tip tip-magenta"><h3>Dados fictícios</h3><p>Este é um projeto de estudo: use nomes e e-mails inventados. Os dados são apagados quando a API reinicia.</p></div>
            </div>
        </section>
    </section>`;

    const statsBox = root.querySelector('[data-stats]');
    const recentBox = root.querySelector('[data-recent]');

    async function load() {
        recentBox.innerHTML = loading('Carregando games...');
        const [games, categories, developers, platforms] = await Promise.allSettled([
            api.get(`/api/game/v2${query({ size: 6, sort: 'createdAt,desc' })}`),
            lookup('categories'),
            lookup('developers'),
            lookup('platforms')
        ]);
        if (!ctx.isCurrent()) return;

        const value = (result, pick) => (result.status === 'fulfilled' ? pick(result.value) : '—');
        const stats = [
            { label: 'Games', value: value(games, page => pageInfo(page).totalElements), href: '#/games' },
            { label: 'Categorias', value: value(categories, data => data.total), href: '#/categorias' },
            { label: 'Desenvolvedores', value: value(developers, data => data.total), href: '#/desenvolvedores' },
            { label: 'Plataformas', value: value(platforms, data => data.total), href: '#/plataformas' }
        ];
        statsBox.innerHTML = stats.map(stat =>
            `<a class="stat" href="${stat.href}"><div class="stat-value">${esc(stat.value)}</div><div class="stat-label">${stat.label}</div></a>`).join('');

        if (games.status === 'rejected') {
            recentBox.innerHTML = errorState(games.reason);
            recentBox.querySelector('[data-action="retry"]').addEventListener('click', load);
            return;
        }
        const list = items(games.value, 'games');
        recentBox.innerHTML = list.length
            ? `<div class="grid grid-games">${list.map(gameCard).join('')}</div>`
            : emptyState('Nenhum game cadastrado ainda', 'Que tal cadastrar o primeiro?');
    }
    load();
}
