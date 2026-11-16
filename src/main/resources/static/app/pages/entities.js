import { api, items, pageInfo, query, newIdempotencyKey, invalidateLookups } from '../api.js';
import {
    esc, formatDate, loading, emptyState, errorState, toast, showError,
    formModal, confirmDialog, withLogin, pagination
} from '../ui.js';

const PAGE_SIZE = 10;

const CONFIG = {
    categorias: {
        title: 'Categorias',
        subtitle: 'Gêneros dos games, como RPG, Metroidvania ou Roguelike.',
        singular: 'categoria',
        article: 'a',
        newLabel: '+ Nova categoria',
        v1: '/api/category/v1',
        v2: '/api/category/v2',
        rel: 'categories',
        lookup: 'categories',
        filter: 'categoria',
        min: 3,
        max: 255,
        placeholder: 'Ex.: Plataforma 2D'
    },
    desenvolvedores: {
        title: 'Desenvolvedores',
        subtitle: 'Estúdios ou pessoas que criam os games.',
        singular: 'desenvolvedor',
        article: 'o',
        newLabel: '+ Novo desenvolvedor',
        v1: '/api/developer/v1',
        rel: 'developers',
        lookup: 'developers',
        filter: 'desenvolvedor',
        min: 2,
        max: 255,
        placeholder: 'Ex.: Estúdio Pixel Fictício'
    },
    plataformas: {
        title: 'Plataformas',
        subtitle: 'Onde os games estão disponíveis.',
        singular: 'plataforma',
        article: 'a',
        newLabel: '+ Nova plataforma',
        v1: '/api/platform/v1',
        rel: 'platforms',
        lookup: 'platforms',
        filter: 'plataforma',
        min: 2,
        max: 50,
        placeholder: 'Ex.: Nintendo Switch'
    }
};

function nameField(config) {
    return [{
        name: 'name',
        label: 'Nome',
        required: true,
        minLength: config.min,
        maxLength: config.max,
        placeholder: config.placeholder,
        help: `De ${config.min} a ${config.max} caracteres.`
    }];
}

export async function renderEntities(root, ctx, key) {
    const config = CONFIG[key];
    const route = `/${key}`;
    const busca = ctx.params.get('busca') || '';
    const page = Math.max(0, Number(ctx.params.get('page')) || 0);
    const sort = ctx.params.get('sort') === 'createdAt,desc' ? 'createdAt,desc' : 'name,asc';
    const showCount = Boolean(config.v2) && !busca;

    root.innerHTML = `<section class="page">
        <div class="page-header">
            <div>
                <h1 class="page-title">${config.title}</h1>
                <p class="page-subtitle">${config.subtitle}</p>
            </div>
            <button class="btn btn-primary" data-new>${config.newLabel}</button>
        </div>
        <form class="toolbar" data-toolbar>
            <div class="field field-grow">
                <label for="busca">Buscar por nome</label>
                <input id="busca" name="busca" type="search" value="${esc(busca)}" maxlength="100">
            </div>
            <div class="field">
                <label for="sort">Ordenar</label>
                <select id="sort" name="sort">
                    <option value="name,asc" ${sort === 'name,asc' ? 'selected' : ''}>Nome (A–Z)</option>
                    <option value="createdAt,desc" ${sort === 'createdAt,desc' ? 'selected' : ''}>Mais recentes</option>
                </select>
            </div>
            <button class="btn btn-secondary" type="submit">Aplicar</button>
        </form>
        <div data-results>${loading()}</div>
    </section>`;

    const toolbar = root.querySelector('[data-toolbar]');
    toolbar.addEventListener('submit', event => {
        event.preventDefault();
        ctx.navigate(route, { busca: toolbar.busca.value.trim(), sort: toolbar.sort.value });
    });

    const afterChange = () => {
        invalidateLookups(config.lookup);
        ctx.refresh();
    };

    root.querySelector('[data-new]').addEventListener('click', () => {
        const idempotencyKey = newIdempotencyKey();
        formModal({
            title: config.newLabel.replace('+ ', ''),
            fields: nameField(config),
            submitLabel: 'Cadastrar',
            onSubmit: async (values, modal) => {
                const { status } = await api.create(config.v1, values, idempotencyKey);
                toast(status === 200 ? 'Este cadastro já tinha sido feito; nada foi duplicado.' : `${config.singular[0].toUpperCase()}${config.singular.slice(1)} cadastrad${config.article}!`, status === 200 ? 'warn' : 'success');
                modal.close();
                afterChange();
            }
        });
    });

    const results = root.querySelector('[data-results]');

    function edit(entity) {
        formModal({
            title: `Editar ${config.singular}`,
            intro: '<p class="muted">Alterar exige login.</p>',
            fields: nameField(config),
            initial: { name: entity.name },
            submitLabel: 'Salvar',
            onSubmit: async (values, modal) => {
                const saved = await withLogin(() => api.update(`${config.v1}/${entity.id}`, values));
                if (!saved) return;
                toast('Alteração salva.', 'success');
                modal.close();
                afterChange();
            }
        });
    }

    async function remove(entity) {
        const ok = await confirmDialog({
            title: `Excluir ${config.singular}`,
            message: `Excluir “${entity.name}”? Se houver games ligados a ${config.article === 'a' ? 'ela' : 'ele'}, a API não permite a exclusão.`,
            confirmLabel: 'Excluir',
            danger: true
        });
        if (!ok) return;
        try {
            const result = await withLogin(() => api.remove(`${config.v1}/${entity.id}`));
            if (!result) return;
            toast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} excluíd${config.article}.`, 'success');
            afterChange();
        } catch (error) {
            if (error.status === 409) {
                toast(`Não é possível excluir: ainda existem games ligados a “${entity.name}”. Altere ou exclua esses games antes.`, 'error');
            } else {
                showError(error);
            }
        }
    }

    async function load() {
        results.innerHTML = loading();
        const paging = { page, size: PAGE_SIZE, sort };
        const path = busca
            ? `${config.v1}/search${query({ name: busca, ...paging })}`
            : `${config.v2 || config.v1}${query(paging)}`;
        try {
            const data = await api.get(path);
            if (!ctx.isCurrent()) return;
            const list = items(data, config.rel);
            if (!list.length) {
                results.innerHTML = emptyState(busca ? 'Nada encontrado' : `Nenhum registro em ${config.title.toLowerCase()}`,
                    busca ? 'Tente outro termo.' : 'Use o botão acima para cadastrar.');
                return;
            }
            const pager = pagination(pageInfo(data), newPage => ctx.navigate(route, { busca, sort, page: newPage }));
            results.innerHTML = `${busca ? `<p class="muted">Resultados para “${esc(busca)}” · <a href="#${route}">limpar</a></p>` : ''}
                <div class="table-wrap"><table>
                    <thead><tr>
                        <th>ID</th><th>Nome</th>${showCount ? '<th>Games</th>' : ''}<th>Cadastrado em</th><th>Atualizado em</th><th><span class="muted">Ações</span></th>
                    </tr></thead>
                    <tbody>${list.map((entity, index) => `<tr>
                        <td class="num">#${esc(entity.id)}</td>
                        <td class="cell-strong">${esc(entity.name)}</td>
                        ${showCount ? `<td>${esc(entity.gamesCount ?? 0)}</td>` : ''}
                        <td>${formatDate(entity.createdAt)}</td>
                        <td>${formatDate(entity.updatedAt)}</td>
                        <td><div class="actions">
                            <a class="btn btn-ghost btn-sm" href="#/games?filtro=${config.filter}&valor=${entity.id}">Ver games</a>
                            <button class="btn btn-secondary btn-sm" data-edit="${index}">Editar</button>
                            <button class="btn btn-danger btn-sm" data-remove="${index}">Excluir</button>
                        </div></td>
                    </tr>`).join('')}</tbody>
                </table></div>
                <div style="margin-top:18px">${pager.html}</div>`;
            pager.bind(results);
            results.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => edit(list[Number(button.dataset.edit)])));
            results.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => remove(list[Number(button.dataset.remove)])));
        } catch (error) {
            if (!ctx.isCurrent()) return;
            results.innerHTML = errorState(error);
            results.querySelector('[data-action="retry"]').addEventListener('click', load);
        }
    }
    load();
}
