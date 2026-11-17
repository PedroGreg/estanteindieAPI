import { api, auth, newIdempotencyKey } from '../api.js';
import { esc, formatDate, loading, errorState, toast, confirmDialog, formMarkup, attachForm } from '../ui.js';
import { userFields, FICTIONAL_NOTICE, FICTIONAL_BUTTON, bindFictional, openUserForm, deleteUser } from './users.js';

const LOGIN_FIELDS = [
    { name: 'email', label: 'E-mail', type: 'email', required: true, autocomplete: 'username' },
    { name: 'password', label: 'Senha', type: 'password', required: true, autocomplete: 'current-password', trim: false }
];

function renderGuest(root, ctx) {
    root.innerHTML = `<section class="page">
        <div class="page-header">
            <div>
                <h1 class="page-title">Minha conta</h1>
                <p class="page-subtitle">Entre para alterar e excluir registros, ou crie uma conta nova em segundos.</p>
            </div>
        </div>
        <div class="grid grid-2">
            <article class="card">
                <h2 class="section-title">Entrar</h2>
                <p class="muted">Conta de teste: <strong>admin@estanteindie.com</strong> / <strong>admin123</strong></p>
                <div data-login>${formMarkup({ fields: LOGIN_FIELDS, submitLabel: 'Entrar', cancel: false })}</div>
            </article>
            <article class="card">
                <h2 class="section-title">Criar conta</h2>
                ${FICTIONAL_NOTICE}
                <div data-signup>${formMarkup({ fields: userFields(), submitLabel: 'Criar conta', cancel: false, extraActions: FICTIONAL_BUTTON })}</div>
            </article>
        </div>
    </section>`;

    const loginForm = root.querySelector('[data-login] form');
    attachForm(loginForm, LOGIN_FIELDS, async values => {
        const login = await api.login(values.email, values.password);
        toast(`Bem-vindo(a), ${login.name}!`, 'success');
        renderAccount(root, ctx);
    });

    const signupForm = root.querySelector('[data-signup] form');
    const idempotencyKey = newIdempotencyKey();
    bindFictional(signupForm);
    attachForm(signupForm, userFields(), async values => {
        const { status } = await api.create('/api/user/v1', values, idempotencyKey);
        toast(status === 200 ? 'Esta conta já tinha sido criada.' : 'Conta criada! Entrando...', 'success');
        const login = await api.login(values.email, values.password);
        toast(`Bem-vindo(a), ${login.name}!`, 'success');
        renderAccount(root, ctx);
    });
}

async function renderLogged(root, ctx) {
    const session = auth.user || {};
    root.innerHTML = `<section class="page">${loading('Carregando sua conta...')}</section>`;
    let user;
    try {
        user = await api.get(`/api/user/v1/${session.id}`);
    } catch (error) {
        if (!ctx.isCurrent()) return;
        if (error.status === 404) {
            auth.clear();
            toast('Sua conta não existe mais (a API pode ter reiniciado). Entre novamente.', 'warn');
            renderGuest(root, ctx);
            return;
        }
        root.innerHTML = `<section class="page">${errorState(error)}</section>`;
        root.querySelector('[data-action="retry"]').addEventListener('click', () => renderLogged(root, ctx));
        return;
    }
    if (!ctx.isCurrent()) return;

    const key = auth.key || '';
    const masked = key ? `${key.slice(0, 8)}••••••••••••${key.slice(-4)}` : '';
    root.innerHTML = `<section class="page">
        <div class="page-header">
            <div>
                <h1 class="page-title">Olá, ${esc(user.name)}</h1>
                <p class="page-subtitle">Você está logado e pode alterar e excluir registros. Contas e perfis: cada pessoa só altera os próprios.</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary" data-edit>Editar meus dados</button>
                <button class="btn btn-ghost" data-logout>Sair</button>
            </div>
        </div>
        <article class="card">
            <h2 class="section-title">Meus dados</h2>
            <dl class="detail-grid" style="margin-top:0">
                <div class="detail-item"><dt>Nome</dt><dd>${esc(user.name)}</dd></div>
                <div class="detail-item"><dt>E-mail</dt><dd>${esc(user.email)}</dd></div>
                <div class="detail-item"><dt>Usuário</dt><dd>#${esc(user.id)}</dd></div>
                <div class="detail-item"><dt>Perfil</dt><dd>${user.userProfileId ? `#${esc(user.userProfileId)}` : '—'}</dd></div>
                <div class="detail-item"><dt>Conta criada em</dt><dd>${formatDate(user.createdAt)}</dd></div>
                <div class="detail-item"><dt>Última alteração</dt><dd>${formatDate(user.updatedAt)}</dd></div>
                <div class="detail-item" style="grid-column:1/-1"><dt>Bio</dt><dd>${esc(user.bio || 'Sem bio')}</dd></div>
            </dl>
        </article>
        <article class="card">
            <h2 class="section-title">Chave de acesso (X-API-Key)</h2>
            <p class="muted">É ela que libera as alterações e exclusões. Também serve para testar no <a href="/swagger-ui/index.html">Swagger</a>: cole no campo X-API-Key dos PUT e DELETE. Um novo login gera outra chave e invalida esta.</p>
            <div class="account-key">
                <code data-key>${esc(masked)}</code>
                <button class="btn btn-ghost btn-sm" data-show>Mostrar</button>
                <button class="btn btn-secondary btn-sm" data-copy>Copiar</button>
            </div>
        </article>
        <article class="card">
            <h2 class="section-title" style="color:var(--magenta)">Zona de perigo</h2>
            <p class="muted">Excluir a conta apaga o seu usuário e o seu perfil. Não dá para desfazer.</p>
            <button class="btn btn-danger" data-delete>Excluir minha conta</button>
        </article>
    </section>`;

    const keyBox = root.querySelector('[data-key]');
    root.querySelector('[data-show]').addEventListener('click', event => {
        const showing = keyBox.textContent === key;
        keyBox.textContent = showing ? masked : key;
        event.target.textContent = showing ? 'Mostrar' : 'Ocultar';
    });
    root.querySelector('[data-copy]').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(key);
            toast('Chave copiada.', 'success');
        } catch {
            keyBox.textContent = key;
            toast('Não foi possível copiar automaticamente. A chave está visível para você copiar.', 'warn');
        }
    });
    root.querySelector('[data-edit]').addEventListener('click', () =>
        openUserForm({ user, onSaved: () => renderAccount(root, ctx) }));
    root.querySelector('[data-logout]').addEventListener('click', async () => {
        const ok = await confirmDialog({ title: 'Sair', message: 'Deseja sair? A sua chave de acesso será invalidada.', confirmLabel: 'Sair' });
        if (!ok) return;
        await api.logout().catch(() => {});
        toast('Você saiu da sua conta.', 'info');
        renderGuest(root, ctx);
    });
    root.querySelector('[data-delete]').addEventListener('click', () =>
        deleteUser(user, { onDeleted: () => renderGuest(root, ctx) }));
}

export function renderAccount(root, ctx) {
    if (auth.isLogged()) return renderLogged(root, ctx);
    return renderGuest(root, ctx);
}
