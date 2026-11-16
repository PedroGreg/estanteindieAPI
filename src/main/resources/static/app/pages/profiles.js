import { api, auth, items, pageInfo, query, newIdempotencyKey } from '../api.js';
import {
    esc, formatDate, loading, emptyState, errorState, toast, showError,
    formModal, confirmDialog, withLogin, pagination
} from '../ui.js';

const PAGE_SIZE = 10;

const BIO_FIELD = [{ name: 'bio', label: 'Bio', type: 'textarea', maxLength: 255, help: 'Até 255 caracteres. Pode ficar vazia.' }];

export async function renderProfiles(root, ctx) {
    const busca = ctx.params.get('busca') || '';
    const page = Math.max(0, Number(ctx.params.get('page')) || 0);

    root.innerHTML = `<section class="page">
        <div class="page-header">
            <div>
                <h1 class="page-title">Perfis</h1>
                <p class="page-subtitle">Cada usuário ganha um perfil no cadastro. Aqui você também pode criar perfis avulsos (sem usuário) e buscar pela bio. Você só pode alterar o seu próprio perfil.</p>
            </div>
            <button class="btn btn-primary" data-new>+ Novo perfil avulso</button>
        </div>
        <form class="toolbar" data-toolbar>
            <div class="field field-grow">
                <label for="busca">Buscar pela bio</label>
                <input id="busca" name="busca" type="search" value="${esc(busca)}" placeholder="Ex.: metroidvania" maxlength="100">
            </div>
            <button class="btn btn-secondary" type="submit">Buscar</button>
        </form>
        <div data-results>${loading()}</div>
    </section>`;

    root.querySelector('[data-toolbar]').addEventListener('submit', event => {
        event.preventDefault();
        ctx.navigate('/perfis', { busca: event.target.busca.value.trim() });
    });

    root.querySelector('[data-new]').addEventListener('click', () => {
        const idempotencyKey = newIdempotencyKey();
        formModal({
            title: 'Novo perfil avulso',
            intro: '<p class="muted">Um perfil avulso não fica ligado a nenhum usuário. Para ter um perfil com usuário, cadastre um usuário.</p>',
            fields: BIO_FIELD,
            submitLabel: 'Cadastrar',
            onSubmit: async (values, modal) => {
                const { status } = await api.create('/api/userprofile/v1', { bio: values.bio }, idempotencyKey);
                toast(status === 200 ? 'Este cadastro já tinha sido feito; nada foi duplicado.' : 'Perfil cadastrado!', status === 200 ? 'warn' : 'success');
                modal.close();
                ctx.refresh();
            }
        });
    });

    const results = root.querySelector('[data-results]');

    function edit(profile) {
        formModal({
            title: `Editar perfil #${profile.id}`,
            intro: '<p class="muted">Alterar exige login.</p>',
            fields: BIO_FIELD,
            initial: { bio: profile.bio || '' },
            submitLabel: 'Salvar',
            onSubmit: async (values, modal) => {
                const saved = await withLogin(() => api.update(`/api/userprofile/v1/${profile.id}`, { bio: values.bio }));
                if (!saved) return;
                toast('Perfil atualizado.', 'success');
                modal.close();
                ctx.refresh();
            }
        });
    }

    async function remove(profile) {
        const ok = await confirmDialog({
            title: 'Excluir perfil',
            message: profile.userId
                ? `Este perfil pertence a ${profile.userName}. A API não permite excluí-lo sozinho: exclua o usuário (o perfil vai junto). Tentar mesmo assim?`
                : `Excluir o perfil #${profile.id}?`,
            confirmLabel: 'Excluir',
            danger: true
        });
        if (!ok) return;
        try {
            const result = await withLogin(() => api.remove(`/api/userprofile/v1/${profile.id}`));
            if (!result) return;
            toast('Perfil excluído.', 'success');
            ctx.refresh();
        } catch (error) {
            if (error.status === 409) {
                toast('Não é possível excluir: o perfil pertence a um usuário. Exclua o usuário na tela Usuários.', 'error');
            } else {
                showError(error);
            }
        }
    }

    async function load() {
        results.innerHTML = loading();
        const paging = { page, size: PAGE_SIZE, sort: 'id,asc' };
        const path = busca ? `/api/userprofile/v1/search${query({ bio: busca, ...paging })}` : `/api/userprofile/v1${query(paging)}`;
        try {
            const data = await api.get(path);
            if (!ctx.isCurrent()) return;
            const list = items(data, 'user-profiles');
            if (!list.length) {
                results.innerHTML = emptyState(busca ? 'Nenhum perfil encontrado' : 'Nenhum perfil cadastrado');
                return;
            }
            const pager = pagination(pageInfo(data), newPage => ctx.navigate('/perfis', { busca, page: newPage }));
            results.innerHTML = `${busca ? `<p class="muted">Perfis com “${esc(busca)}” na bio · <a href="#/perfis">limpar</a></p>` : ''}
                <div class="table-wrap"><table>
                    <thead><tr><th>ID</th><th>Bio</th><th>Usuário</th><th>Cadastrado em</th><th><span class="muted">Ações</span></th></tr></thead>
                    <tbody>${list.map((profile, index) => `<tr>
                        <td class="num">#${esc(profile.id)}</td>
                        <td class="cell-clip" title="${esc(profile.bio || '')}">${esc(profile.bio || '—')}</td>
                        <td>${profile.userId ? esc(profile.userName) : '<span class="muted">avulso</span>'}</td>
                        <td>${formatDate(profile.createdAt)}</td>
                        <td><div class="actions">
                            ${auth.user && auth.user.id === profile.userId ? `
                            <button class="btn btn-secondary btn-sm" data-edit="${index}">Editar</button>
                            <button class="btn btn-danger btn-sm" data-remove="${index}">Excluir</button>` : '<span class="muted">—</span>'}
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
