import { api, items, pageInfo, lookup, query, newIdempotencyKey, invalidateLookups } from '../api.js';
import {
    esc, formatDate, statusBadge, STATUS, loading, emptyState, errorState, toast, showError,
    formModal, confirmDialog, withLogin, pagination, jsonBlock
} from '../ui.js';

const PAGE_SIZE = 12;

const FILTERS = {
    status: { label: 'Status', path: value => `/api/game/v1/status/${encodeURIComponent(value)}` },
    categoria: { label: 'Categoria', lookup: 'categories', path: value => `/api/game/v1/category/${value}` },
    desenvolvedor: { label: 'Desenvolvedor', lookup: 'developers', path: value => `/api/game/v1/developer/${value}` },
    plataforma: { label: 'Plataforma', lookup: 'platforms', path: value => `/api/game/v1/platform/${value}` }
};

const SORTS = [
    { value: 'name,asc', label: 'Nome (A–Z)' },
    { value: 'name,desc', label: 'Nome (Z–A)' },
    { value: 'createdAt,desc', label: 'Mais recentes' },
    { value: 'createdAt,asc', label: 'Mais antigos' }
];

export function fromV1(game) {
    return {
        id: game.id,
        name: game.name,
        status: game.status,
        developerName: game.developer ? game.developer.name : null,
        categoryName: game.category ? game.category.name : null,
        platformNames: (game.platforms || []).map(platform => platform.name),
        totalAchievements: undefined
    };
}

export function gameCard(game) {
    const platforms = game.platformNames || [];
    return `<a class="game-card" href="#/games/${game.id}">
        <div class="game-card-top">
            <h3>${esc(game.name)}</h3>
            ${statusBadge(game.status)}
        </div>
        <div class="game-meta">
            <span>Desenvolvedor: <strong>${esc(game.developerName || '—')}</strong></span>
            <span>Categoria: <strong>${esc(game.categoryName || '—')}</strong></span>
        </div>
        <div class="game-card-foot">
            <div class="chips">${platforms.slice(0, 3).map(name => `<span class="chip">${esc(name)}</span>`).join('')}${platforms.length > 3 ? `<span class="chip">+${platforms.length - 3}</span>` : ''}</div>
            ${game.totalAchievements !== undefined && game.totalAchievements !== null ? `<span class="trophy" title="Total de conquistas">🏆 ${game.totalAchievements}</span>` : ''}
        </div>
    </a>`;
}

function filterValueOptions(type, lookups) {
    if (type === 'status') {
        return Object.entries(STATUS).map(([value, info]) => ({ value, label: info.label }));
    }
    const list = lookups[FILTERS[type].lookup] || [];
    return list.map(entry => ({ value: entry.id, label: entry.name }));
}

export async function renderGames(root, ctx) {
    const params = ctx.params;
    const busca = params.get('busca') || '';
    const filtro = FILTERS[params.get('filtro')] ? params.get('filtro') : '';
    const valor = params.get('valor') || '';
    const page = Math.max(0, Number(params.get('page')) || 0);
    const sort = SORTS.some(option => option.value === params.get('sort')) ? params.get('sort') : 'name,asc';

    root.innerHTML = `<section class="page">
        <div class="page-header">
            <div>
                <h1 class="page-title">Games</h1>
                <p class="page-subtitle">Explore o catálogo, filtre por status, categoria, desenvolvedor ou plataforma e cadastre novos games.</p>
            </div>
            <button class="btn btn-primary" data-new-game>+ Novo game</button>
        </div>
        <form class="toolbar" data-toolbar>
            <div class="field field-grow">
                <label for="busca">Buscar por nome</label>
                <input id="busca" name="busca" type="search" value="${esc(busca)}" placeholder="Ex.: hollow" maxlength="100">
            </div>
            <div class="field">
                <label for="filtro">Filtrar por</label>
                <select id="filtro" name="filtro">
                    <option value="">Sem filtro</option>
                    ${Object.entries(FILTERS).map(([key, info]) => `<option value="${key}" ${key === filtro ? 'selected' : ''}>${info.label}</option>`).join('')}
                </select>
            </div>
            <div class="field" data-valor-field ${filtro ? '' : 'hidden'}>
                <label for="valor">Valor</label>
                <select id="valor" name="valor"><option value="">Carregando...</option></select>
            </div>
            <div class="field">
                <label for="sort">Ordenar</label>
                <select id="sort" name="sort">${SORTS.map(option => `<option value="${option.value}" ${option.value === sort ? 'selected' : ''}>${option.label}</option>`).join('')}</select>
            </div>
            <button class="btn btn-secondary" type="submit">Aplicar</button>
            <p class="toolbar-hint">A API aceita um critério por vez: a busca por nome e o filtro não são combinados (a busca tem prioridade).</p>
        </form>
        <div data-results>${loading('Carregando games...')}</div>
    </section>`;

    const toolbar = root.querySelector('[data-toolbar]');
    const valorField = root.querySelector('[data-valor-field]');
    const valorSelect = root.querySelector('#valor');
    const lookups = {};

    async function fillValues(type, selected) {
        if (!type) {
            valorField.hidden = true;
            return;
        }
        valorField.hidden = false;
        if (FILTERS[type].lookup && !lookups[FILTERS[type].lookup]) {
            valorSelect.innerHTML = '<option value="">Carregando...</option>';
            try {
                lookups[FILTERS[type].lookup] = (await lookup(FILTERS[type].lookup)).list;
            } catch (error) {
                showError(error);
                lookups[FILTERS[type].lookup] = [];
            }
        }
        const options = filterValueOptions(type, lookups);
        valorSelect.innerHTML = `<option value="">Selecione...</option>` + options
            .map(option => `<option value="${esc(option.value)}" ${String(option.value) === String(selected) ? 'selected' : ''}>${esc(option.label)}</option>`).join('');
    }

    toolbar.filtro.addEventListener('change', () => {
        toolbar.busca.value = '';
        fillValues(toolbar.filtro.value, '');
    });
    toolbar.addEventListener('submit', event => {
        event.preventDefault();
        const searchText = toolbar.busca.value.trim();
        const type = searchText ? '' : toolbar.filtro.value;
        ctx.navigate('/games', {
            busca: searchText,
            filtro: type,
            valor: type ? valorSelect.value : '',
            sort: toolbar.sort.value
        });
    });
    root.querySelector('[data-new-game]').addEventListener('click', () =>
        openGameForm({ onSaved: game => ctx.navigate(game ? `/games/${game.id}` : '/games') }));

    fillValues(filtro, valor);

    const results = root.querySelector('[data-results]');
    async function load() {
        results.innerHTML = loading('Carregando games...');
        const paging = { page, size: PAGE_SIZE, sort };
        let path;
        let mapper = game => game;
        let description = '';
        if (busca) {
            path = `/api/game/v1/search${query({ name: busca, ...paging })}`;
            mapper = fromV1;
            description = `Resultados para “${busca}”`;
        } else if (filtro && valor) {
            path = `${FILTERS[filtro].path(valor)}${query(paging)}`;
            mapper = fromV1;
            description = `Filtrando por ${FILTERS[filtro].label.toLowerCase()}`;
        } else {
            path = `/api/game/v2${query(paging)}`;
        }
        try {
            const data = await api.get(path);
            if (!ctx.isCurrent()) return;
            const list = items(data, 'games').map(mapper);
            const info = pageInfo(data);
            if (!list.length) {
                results.innerHTML = emptyState(
                    busca || (filtro && valor) ? 'Nenhum game encontrado' : 'Nenhum game cadastrado',
                    busca || (filtro && valor) ? 'Tente outro termo ou remova o filtro.' : 'Cadastre o primeiro game do catálogo.');
                return;
            }
            const pager = pagination(info, newPage => ctx.navigate('/games', { busca, filtro, valor, sort, page: newPage }));
            results.innerHTML = `${description ? `<p class="muted">${esc(description)} · <a href="#/games">limpar</a></p>` : ''}
                <div class="grid grid-games">${list.map(gameCard).join('')}</div>
                <div style="margin-top:22px">${pager.html}</div>`;
            pager.bind(results);
        } catch (error) {
            if (!ctx.isCurrent()) return;
            results.innerHTML = errorState(error);
            results.querySelector('[data-action="retry"]').addEventListener('click', load);
        }
    }
    load();
}

export async function openGameForm({ game = null, onSaved }) {
    let lists;
    try {
        const [categories, developers, platforms] = await Promise.all([lookup('categories'), lookup('developers'), lookup('platforms')]);
        lists = { categories: categories.list, developers: developers.list, platforms: platforms.list };
    } catch (error) {
        showError(error);
        return;
    }

    if (!lists.categories.length || !lists.developers.length) {
        toast('Cadastre pelo menos uma categoria e um desenvolvedor antes de criar um game.', 'warn');
        return;
    }

    const editing = Boolean(game);
    const idempotencyKey = newIdempotencyKey();
    const fields = [
        { name: 'name', label: 'Nome', required: true, maxLength: 255, placeholder: 'Ex.: Celeste' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: Object.entries(STATUS).map(([value, info]) => ({ value, label: info.label })) },
        { name: 'developerId', label: 'Desenvolvedor', type: 'select', required: true, numeric: true, options: lists.developers.map(dev => ({ value: dev.id, label: dev.name })) },
        { name: 'categoryId', label: 'Categoria', type: 'select', required: true, numeric: true, options: lists.categories.map(cat => ({ value: cat.id, label: cat.name })) },
        { name: 'platformIds', label: 'Plataformas', type: 'checkboxes', options: lists.platforms.map(plat => ({ value: plat.id, label: plat.name })), emptyText: 'Nenhuma plataforma cadastrada. O game pode ficar sem plataformas.' },
        { name: 'totalAchievements', label: 'Total de conquistas', type: 'number', required: true, min: 0, max: 10000, help: 'Quantidade total de conquistas do jogo (0 a 10000).' }
    ];
    const initial = editing
        ? {
            name: game.name,
            status: game.status,
            developerId: game.developerId,
            categoryId: game.categoryId,
            platformIds: game.platformIds,
            totalAchievements: game.totalAchievements ?? 0
        }
        : { totalAchievements: 0 };

    formModal({
        title: editing ? `Editar ${game.name}` : 'Novo game',
        intro: editing ? '<p class="muted">Alterar exige login. Todos os campos são substituídos.</p>' : '',
        wide: true,
        fields,
        initial,
        submitLabel: editing ? 'Salvar alterações' : 'Cadastrar game',
        onSubmit: async (values, modal) => {
            if (editing) {
                const saved = await withLogin(() => api.update(`/api/game/v2/${game.id}`, values));
                if (!saved) return;
                invalidateLookups('categories');
                toast('Game atualizado.', 'success');
                modal.close();
                onSaved(saved);
            } else {
                const { status, data } = await api.create('/api/game/v2', values, idempotencyKey);
                invalidateLookups('categories');
                toast(status === 409 ? 'Este cadastro já tinha sido feito; nada foi duplicado.' : 'Game cadastrado!', status === 409 ? 'warn' : 'success');
                modal.close();
                onSaved(data);
            }
        }
    });
}

function linksPanel(links) {
    if (!links) return '<p class="muted">Sem links.</p>';
    const rows = Object.entries(links).flatMap(([rel, value]) => (Array.isArray(value) ? value : [value]).map(link => ({ rel, ...link })));
    return `<div class="table-wrap"><table>
        <thead><tr><th>rel</th><th>Método</th><th>Endereço</th></tr></thead>
        <tbody>${rows.map(link => `<tr>
            <td class="cell-strong">${esc(link.rel)}</td>
            <td><span class="method method-${esc(link.type || 'GET')}">${esc(link.type || 'GET')}</span></td>
            <td class="cell-clip"><code>${esc(link.href)}</code></td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

export async function renderGameDetail(root, ctx, id) {
    root.innerHTML = `<section class="page">${loading('Carregando game...')}</section>`;
    let v1;
    let v2;
    try {
        [v2, v1] = await Promise.all([api.get(`/api/game/v2/${id}`), api.get(`/api/game/v1/${id}`)]);
    } catch (error) {
        if (!ctx.isCurrent()) return;
        root.innerHTML = `<section class="page"><p class="breadcrumb"><a href="#/games">Games</a> / #${id}</p>${errorState(error)}</section>`;
        root.querySelector('[data-action="retry"]').addEventListener('click', () => renderGameDetail(root, ctx, id));
        return;
    }
    if (!ctx.isCurrent()) return;

    const developer = v1.developer || {};
    const category = v1.category || {};
    const platforms = v1.platforms || [];

    root.innerHTML = `<section class="page">
        <p class="breadcrumb"><a href="#/games">Games</a> / ${esc(v2.name)}</p>
        <article class="card">
            <div class="detail-head">
                <div>
                    <h1 class="detail-title">${esc(v2.name)}</h1>
                    <div style="margin-top:10px">${statusBadge(v2.status)}</div>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary" data-edit>Editar</button>
                    <button class="btn btn-danger" data-delete>Excluir</button>
                </div>
            </div>
            <dl class="detail-grid">
                <div class="detail-item"><dt>Conquistas</dt><dd class="achievements">🏆 ${esc(v2.totalAchievements ?? 0)}</dd></div>
                <div class="detail-item"><dt>Desenvolvedor</dt><dd><a href="#/games?filtro=desenvolvedor&valor=${developer.id}">${esc(developer.name || '—')}</a></dd></div>
                <div class="detail-item"><dt>Categoria</dt><dd><a href="#/games?filtro=categoria&valor=${category.id}">${esc(category.name || '—')}</a></dd></div>
                <div class="detail-item"><dt>Cadastrado em</dt><dd>${formatDate(v2.createdAt)}</dd></div>
                <div class="detail-item"><dt>Atualizado em</dt><dd>${formatDate(v2.updatedAt)}</dd></div>
                <div class="detail-item"><dt>ID</dt><dd>#${esc(v2.id)}</dd></div>
            </dl>
            <h2 class="section-title" style="margin-top:24px">Plataformas</h2>
            ${platforms.length
                ? `<div class="chips">${platforms.map(platform => `<a class="chip" href="#/games?filtro=plataforma&valor=${platform.id}">${esc(platform.name)}</a>`).join('')}</div>`
                : '<p class="muted">Nenhuma plataforma informada.</p>'}
            <p style="margin-top:18px"><a href="#/games?filtro=status&valor=${esc(v2.status)}">Ver outros games com o mesmo status →</a></p>
        </article>
        <article class="card">
            <h2 class="section-title">Links HATEOAS (v1)</h2>
            <p class="muted">Cada resposta da API traz os links para as próximas ações possíveis.</p>
            ${linksPanel(v1._links)}
            <details class="raw" style="margin-top:16px"><summary>Ver resposta JSON da v1</summary>${jsonBlock(v1)}</details>
            <details class="raw" style="margin-top:8px"><summary>Ver resposta JSON da v2</summary>${jsonBlock(v2)}</details>
        </article>
    </section>`;

    root.querySelector('[data-edit]').addEventListener('click', () => openGameForm({
        game: {
            id: v2.id,
            name: v2.name,
            status: v2.status,
            developerId: developer.id,
            categoryId: category.id,
            platformIds: platforms.map(platform => platform.id),
            totalAchievements: v2.totalAchievements
        },
        onSaved: () => renderGameDetail(root, ctx, id)
    }));

    root.querySelector('[data-delete]').addEventListener('click', async () => {
        const ok = await confirmDialog({
            title: 'Excluir game',
            message: `Excluir “${v2.name}”? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
            danger: true
        });
        if (!ok) return;
        try {
            const result = await withLogin(() => api.remove(`/api/game/v1/${id}`));
            if (!result) return;
            invalidateLookups('categories');
            toast('Game excluído.', 'success');
            ctx.navigate('/games');
        } catch (error) {
            showError(error);
        }
    });
}
