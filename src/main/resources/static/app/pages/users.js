import { api, auth, items, pageInfo, query, newIdempotencyKey } from '../api.js';
import {
    esc, formatDate, loading, emptyState, errorState, toast, showError,
    formModal, openModal, confirmDialog, withLogin, pagination, fillForm
} from '../ui.js';
import { fictionalUser } from '../fictional.js';

const PAGE_SIZE = 10;

export function userFields({ editing = false } = {}) {
    return [
        { name: 'name', label: 'Nome', required: true, minLength: 3, maxLength: 255, placeholder: 'Ex.: Jogador Pixel', autocomplete: 'off' },
        { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 255, placeholder: 'ex.: jogador.pixel@exemplo.com', autocomplete: 'off' },
        {
            name: 'password',
            label: editing ? 'Nova senha' : 'Senha',
            type: 'password',
            required: !editing,
            minLength: 6,
            maxLength: 255,
            trim: false,
            autocomplete: 'new-password',
            help: editing ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 6 caracteres. Crie uma senha só para este teste.'
        },
        { name: 'bio', label: 'Bio', type: 'textarea', maxLength: 255, placeholder: 'Conte um pouco sobre seus games favoritos' }
    ];
}

export const FICTIONAL_NOTICE = '<p class="muted">Use <strong>dados fictícios</strong>: nome inventado, e-mail de exemplo e uma senha criada só para este teste. Nunca cadastre dados reais.</p>';
export const FICTIONAL_BUTTON = '<button type="button" class="btn btn-ghost" data-fictional>Gerar dados fictícios</button>';

export function bindFictional(form) {
    const button = form.querySelector('[data-fictional]');
    if (!button) return;
    button.addEventListener('click', () => {
        const data = fictionalUser();
        fillForm(form, data);
        const password = form.elements.password;
        if (password) password.type = 'text';
        toast('Dados fictícios gerados. Anote a senha para fazer login depois!', 'info');
    });
}

function cleanUserValues(values) {
    const body = { ...values };
    if (!body.password) delete body.password;
    return body;
}

export function openUserForm({ user = null, onSaved }) {
    const editing = Boolean(user);
    const idempotencyKey = newIdempotencyKey();
    const modal = formModal({
        title: editing ? `Editar ${user.name}` : 'Novo usuário',
        intro: editing ? '<p class="muted">Alterar exige login.</p>' : FICTIONAL_NOTICE,
        fields: userFields({ editing }),
        initial: editing ? { name: user.name, email: user.email, bio: user.bio || '' } : {},
        submitLabel: editing ? 'Salvar alterações' : 'Cadastrar',
        extraActions: editing ? '' : FICTIONAL_BUTTON,
        onSubmit: async (values, current) => {
            if (editing) {
                const saved = await withLogin(() => api.update(`/api/user/v1/${user.id}`, cleanUserValues(values)));
                if (!saved) return;
                if (auth.user && auth.user.id === saved.id) auth.updateUser(saved);
                toast('Usuário atualizado.', 'success');
                current.close();
                onSaved(saved, values);
            } else {
                const { status, data } = await api.create('/api/user/v1', values, idempotencyKey);
                toast(status === 200 ? 'Este cadastro já tinha sido feito; nada foi duplicado.' : 'Usuário cadastrado!', status === 200 ? 'warn' : 'success');
                current.close();
                onSaved(data, values);
            }
        }
    });
    bindFictional(modal.form);
    return modal;
}

export async function deleteUser(user, { onDeleted }) {
    const self = auth.user && auth.user.id === user.id;
    const ok = await confirmDialog({
        title: 'Excluir usuário',
        message: self
            ? 'Excluir a SUA conta? O perfil é apagado junto e você sairá da sessão.'
            : `Excluir “${user.name}”? O perfil dele(a) é apagado junto.`,
        confirmLabel: 'Excluir',
        danger: true
    });
    if (!ok) return;
    try {
        const result = await withLogin(() => api.remove(`/api/user/v1/${user.id}`));
        if (!result) return;
        if (self) auth.clear();
        toast('Usuário excluído.', 'success');
        onDeleted();
    } catch (error) {
        showError(error);
    }
}

async function showProfile(user) {
    if (!user.userProfileId) {
        toast('Este usuário não tem perfil.', 'info');
        return;
    }
    try {
        const profile = await api.get(`/api/userprofile/v1/${user.userProfileId}`);
        const modal = openModal({
            title: `Perfil de ${user.name}`,
            body: `<dl class="detail-grid" style="margin-top:0">
                <div class="detail-item"><dt>Perfil</dt><dd>#${esc(profile.id)}</dd></div>
                <div class="detail-item"><dt>Usuário</dt><dd>${esc(profile.userName || user.name)}</dd></div>
                <div class="detail-item" style="grid-column:1/-1"><dt>Bio</dt><dd>${esc(profile.bio || 'Sem bio')}</dd></div>
            </dl>
            <div class="form-actions" style="margin-top:18px">
                <a class="btn btn-ghost" href="#/perfis">Ver todos os perfis</a>
                <button class="btn btn-primary" data-ok>Fechar</button>
            </div>`
        });
        modal.element.querySelector('[data-ok]').addEventListener('click', modal.close);
        modal.element.querySelector('a').addEventListener('click', modal.close);
    } catch (error) {
        showError(error);
    }
}

export async function renderUsers(root, ctx) {
    const busca = ctx.params.get('busca') || '';
    const page = Math.max(0, Number(ctx.params.get('page')) || 0);

    root.innerHTML = `<section class="page">
        <div class="page-header">
            <div>
                <h1 class="page-title">Usuários</h1>
                <p class="page-subtitle">Pessoas cadastradas na plataforma. Cada usuário tem um perfil com bio; a senha nunca é exibida.</p>
            </div>
            <button class="btn btn-primary" data-new>+ Novo usuário</button>
        </div>
        <form class="toolbar" data-toolbar>
            <div class="field field-grow">
                <label for="busca">Buscar por nome</label>
                <input id="busca" name="busca" type="search" value="${esc(busca)}" maxlength="100">
            </div>
            <button class="btn btn-secondary" type="submit">Buscar</button>
        </form>
        <div data-results>${loading()}</div>
    </section>`;

    root.querySelector('[data-toolbar]').addEventListener('submit', event => {
        event.preventDefault();
        ctx.navigate('/usuarios', { busca: event.target.busca.value.trim() });
    });
    root.querySelector('[data-new]').addEventListener('click', () => openUserForm({ onSaved: () => ctx.refresh() }));

    const results = root.querySelector('[data-results]');
    async function load() {
        results.innerHTML = loading();
        const paging = { page, size: PAGE_SIZE, sort: 'name,asc' };
        const path = busca ? `/api/user/v1/search${query({ name: busca, ...paging })}` : `/api/user/v1${query(paging)}`;
        try {
            const data = await api.get(path);
            if (!ctx.isCurrent()) return;
            const list = items(data, 'users');
            if (!list.length) {
                results.innerHTML = emptyState(busca ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado');
                return;
            }
            const pager = pagination(pageInfo(data), newPage => ctx.navigate('/usuarios', { busca, page: newPage }));
            results.innerHTML = `${busca ? `<p class="muted">Resultados para “${esc(busca)}” · <a href="#/usuarios">limpar</a></p>` : ''}
                <div class="table-wrap"><table>
                    <thead><tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Bio</th><th>Cadastrado em</th><th><span class="muted">Ações</span></th></tr></thead>
                    <tbody>${list.map((user, index) => `<tr>
                        <td class="num">#${esc(user.id)}</td>
                        <td class="cell-strong">${esc(user.name)}${auth.user && auth.user.id === user.id ? ' <span class="badge status-released">você</span>' : ''}</td>
                        <td>${esc(user.email)}</td>
                        <td class="cell-clip" title="${esc(user.bio || '')}">${esc(user.bio || '—')}</td>
                        <td>${formatDate(user.createdAt)}</td>
                        <td><div class="actions">
                            <button class="btn btn-ghost btn-sm" data-profile="${index}">Perfil</button>
                            <button class="btn btn-secondary btn-sm" data-edit="${index}">Editar</button>
                            <button class="btn btn-danger btn-sm" data-remove="${index}">Excluir</button>
                        </div></td>
                    </tr>`).join('')}</tbody>
                </table></div>
                <div style="margin-top:18px">${pager.html}</div>`;
            pager.bind(results);
            results.querySelectorAll('[data-profile]').forEach(button => button.addEventListener('click', () => showProfile(list[Number(button.dataset.profile)])));
            results.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () =>
                openUserForm({ user: list[Number(button.dataset.edit)], onSaved: () => ctx.refresh() })));
            results.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () =>
                deleteUser(list[Number(button.dataset.remove)], { onDeleted: () => ctx.refresh() })));
        } catch (error) {
            if (!ctx.isCurrent()) return;
            results.innerHTML = errorState(error);
            results.querySelector('[data-action="retry"]').addEventListener('click', load);
        }
    }
    load();
}
