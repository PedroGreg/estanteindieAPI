API REST para gerenciar um catálogo de **games indie**: desenvolvedores, categorias, plataformas, games, usuários e perfis.

> 🎮 [Usar pelo site](/) · 🧪 [Testar no Swagger](/swagger-ui/index.html) · 📜 [Termos de Serviço](/termos.html)

---

## 🚀 Primeiros passos

> 🎮 **Prefere uma interface?** A página inicial ([/](/)) faz tudo isto por você: cadastro, login, alterações e exclusões, com os headers enviados automaticamente.

1. **Crie um usuário com dados fictícios** em `POST /api/user/v1`. Use um nome inventado (ex.: `Jogador Pixel`) e um e-mail de exemplo (ex.: `jogador.pixel@exemplo.com`). **Não use seu nome, e-mail ou senha reais**: esta é uma API de estudo, os dados ficam visíveis no banco e somem ao reiniciar.
2. **Faça login** em `POST /api/auth/login` com o e-mail e a senha que você cadastrou. A resposta traz uma `apiKey`.
3. **Use a chave** no header `X-API-Key` sempre que for **alterar (PUT)** ou **deletar (DELETE)** algo.
4. Em todo **cadastro (POST)**, envie o header `X-Idempotency-Key` com um valor único (ex.: um UUID novo).

> 💡 **Nenhum usuário vem cadastrado.** Crie a sua conta (passo 1) antes de testar PUT e DELETE. Para testar a regra de dono, crie duas contas.

### Testando pelo Swagger

Abra [/swagger-ui/index.html](/swagger-ui/index.html), abra uma seção (ex.: **Categorias | v1**), escolha um endpoint e clique em **Testar**. Preencha os parâmetros, os headers (`X-Idempotency-Key` nos POST, `X-API-Key` nos PUT e DELETE) e o corpo JSON, e clique em **Executar**. A resposta aparece logo abaixo, com o status e o corpo.

---

## 🔑 Headers da API

| Header | Quando enviar | O que acontece se faltar |
|---|---|---|
| `X-Idempotency-Key` | Em todo **POST** de cadastro (v1 e v2) | **400** – "O header X-Idempotency-Key é obrigatório" |
| `X-API-Key` | Em todo **PUT** e **DELETE**, e no logout | **401** – "Esta operação exige login" |
| `Content-Type: application/json` | Em todo POST e PUT com corpo | **415** – "Content-Type não suportado" |

**Headers que a API devolve**

| Header | Quando aparece | Para que serve |
|---|---|---|
| `X-Rate-Limit-Remaining` | Em toda resposta de `/api/...` | Quantas requisições ainda restam no minuto atual (o limite é de **20 por minuto por IP** e vale só para `/api/...`: abrir o site, o Swagger ou este guia não gasta requisições) |
| `Retry-After` | Na resposta **429** | Quantos segundos esperar antes de tentar de novo |

**Como funciona a idempotência:** se você reenviar um POST com a **mesma** `X-Idempotency-Key`, a API **não cria outro registro**. Ela responde **409 (Conflito)**, avisando que a chave já foi usada e qual é o **id** do registro criado na primeira vez. Use **uma chave nova para cada cadastro novo**.

---

## 📄 Paginação e ordenação

**Todas as listagens são paginadas**: as listas completas (ex.: `GET /api/game/v1`), as buscas (`/search`) e os filtros (ex.: `/api/game/v1/status/RELEASED`). Você controla a página com três parâmetros na URL:

| Parâmetro | O que faz | Padrão | Mínimo | Máximo |
|---|---|---|---|---|
| `page` | Número da página. **Começa em 0** (a primeira página é `page=0`) | **0** | **0** | Não tem (uma página depois da última volta com a lista vazia) |
| `size` | Quantos itens vêm por página | **10** | **1** | **100** |
| `sort` | Campo e direção da ordenação: `campo,asc` ou `campo,desc` | Sem ordenação (ordem do banco, normalmente a de cadastro) | — | — |

> ⚠️ **Limites de paginação: padrão 10, mínimo 1 e máximo 100 itens por página.**
> - `size` **acima de 100** não dá erro: a API devolve **100** itens.
> - `size=0`, negativo ou que não é número volta para o **padrão (10)**.
> - `page` negativo ou que não é número volta para **0**.
> - O máximo fica em `app.pagination.max-page-size`, no `application.properties`.

**Exemplos**
- `GET /api/game/v1?page=0&size=5` — os 5 primeiros games
- `GET /api/game/v1?page=1&size=5` — do 6º ao 10º game
- `GET /api/game/v1?sort=name,asc` — em ordem alfabética
- `GET /api/game/v1?sort=createdAt,desc` — os mais recentes primeiro
- `GET /api/game/v1?sort=status,asc&sort=name,asc` — vários critérios: repita o `sort`
- `GET /api/category/v1/search?name=r&page=0&size=2&sort=name,desc` — busca, paginação e ordenação juntas

**Campos que podem ser usados no `sort`** (use o nome em inglês, como aparece no JSON):

| Recurso | Campos |
|---|---|
| Categorias, desenvolvedores e plataformas | `id`, `name`, `createdAt`, `updatedAt` |
| Games | `id`, `name`, `status`, `totalAchievements`, `createdAt`, `updatedAt` |
| Usuários | `id`, `name`, `email`, `createdAt`, `updatedAt` |
| Perfis | `id`, `bio`, `createdAt`, `updatedAt` |

> ⚠️ Ordenar por um campo que não existe (ex.: `sort=nome,asc`) devolve **400**. A direção é opcional: sem ela, a ordem é crescente (`asc`).

**O que vem na resposta de uma listagem**
```json
{
  "_embedded": { "games": [ { "id": 1, "name": "Undertale", "...": "..." } ] },
  "_links": {
    "first": { "href": "http://localhost:8080/api/game/v1?page=0&size=2" },
    "self":  { "href": "http://localhost:8080/api/game/v1?page=0&size=2" },
    "next":  { "href": "http://localhost:8080/api/game/v1?page=1&size=2" },
    "last":  { "href": "http://localhost:8080/api/game/v1?page=1&size=2" }
  },
  "page": { "size": 2, "totalElements": 4, "totalPages": 2, "number": 0 }
}
```
- `page.size`: itens por página · `page.totalElements`: total de registros · `page.totalPages`: total de páginas · `page.number`: página atual (começa em 0).
- Os links `first`, `prev`, `next` e `last` só aparecem quando fazem sentido (na primeira página não existe `prev`, por exemplo).
- Quando a lista está vazia, não vem o `_embedded`, só o `page` com `totalElements: 0`.

---

## 🧭 Versões (v1 e v2)

A versão faz parte da URL.

| Recurso | v1 | v2 |
|---|---|---|
| Categorias | `/api/category/v1` (CRUD completo) | `/api/category/v2` (só consulta, com `gamesCount`) |
| Games | `/api/game/v1` (CRUD completo) | `/api/game/v2` (consulta, cadastro e alteração, com `totalAchievements`) |
| Desenvolvedores | `/api/developer/v1` | – |
| Plataformas | `/api/platform/v1` | – |
| Usuários | `/api/user/v1` | – |
| Perfis | `/api/userprofile/v1` | – |
| Login | `/api/auth/login` e `/api/auth/logout` (sem versão) | – |

**Diferenças da v2:**
- **Categorias v2:** cada categoria traz `gamesCount` (quantos games ela tem).
- **Games v2:** formato resumido (só os nomes do desenvolvedor, da categoria e das plataformas) e o campo **`totalAchievements`**, a quantidade total de conquistas do jogo. Esse campo **não aparece na v1**, e um game criado pela v1 começa com **0** conquistas.

---

## 📚 Exemplos

**Cadastrar uma categoria** — `POST /api/category/v1`
Header: `X-Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7`
```json
{ "name": "Puzzle" }
```

**Cadastrar um usuário (dados fictícios)** — `POST /api/user/v1`
```json
{ "name": "Jogador Pixel", "email": "jogador.pixel@exemplo.com", "password": "senha123", "bio": "Fã de metroidvanias" }
```

**Login** — `POST /api/auth/login`
```json
{ "email": "jogador.pixel@exemplo.com", "password": "senha123" }
```

**Cadastrar um game (v1)** — `POST /api/game/v1`
```json
{ "name": "Celeste", "status": "RELEASED", "developerId": 1, "categoryId": 1, "platformIds": [1, 2] }
```

**Cadastrar um game com conquistas (v2)** — `POST /api/game/v2`
```json
{ "name": "Celeste", "status": "RELEASED", "developerId": 1, "categoryId": 1, "platformIds": [1, 2], "totalAchievements": 32 }
```

**Alterar uma categoria** — `PUT /api/category/v1/1` com o header `X-API-Key: <sua chave>`
```json
{ "name": "RPG de Ação" }
```

**Buscas e filtros** (todas aceitam `page`, `size` e `sort`; veja a seção **Paginação e ordenação**)

As buscas procuram por **parte do texto** e **não diferenciam maiúsculas de minúsculas** (`rpg` encontra "RPG" e "Action RPG").

| Busca | Rota |
|---|---|
| Categorias pelo nome | `GET /api/category/v1/search?name=rpg` |
| Desenvolvedores pelo nome | `GET /api/developer/v1/search?name=team` |
| Plataformas pelo nome | `GET /api/platform/v1/search?name=switch` |
| Games pelo nome | `GET /api/game/v1/search?name=knight` |
| Games por status | `GET /api/game/v1/status/RELEASED` (`DEVELOPMENT`, `EARLY_ACCESS` ou `RELEASED`) |
| Games de um desenvolvedor | `GET /api/game/v1/developer/1` |
| Games de uma categoria | `GET /api/game/v1/category/1` |
| Games de uma plataforma | `GET /api/game/v1/platform/1` |
| Usuários pelo nome | `GET /api/user/v1/search?name=pixel` |
| Perfis pela bio | `GET /api/userprofile/v1/search?bio=metroidvania` |

---

## 📏 Regras dos campos

| Recurso | Campo | Regra |
|---|---|---|
| Categoria | `name` | Obrigatório, de **3 a 255** caracteres |
| Desenvolvedor | `name` | Obrigatório, de **2 a 255** caracteres |
| Plataforma | `name` | Obrigatório, de **2 a 50** caracteres |
| Game (v1 e v2) | `name` | Obrigatório, até **255** caracteres |
| Game (v1 e v2) | `status` | Obrigatório: `DEVELOPMENT`, `EARLY_ACCESS` ou `RELEASED` (em maiúsculas) |
| Game (v1 e v2) | `developerId`, `categoryId` | Obrigatórios; precisam existir (senão, **404**) |
| Game (v1 e v2) | `platformIds` | Obrigatória, mas **pode ser vazia** (`[]`); os IDs precisam existir e não pode haver `null` na lista |
| Game (só v2) | `totalAchievements` | Obrigatório, de **0 a 10000** |
| Usuário | `name` | Obrigatório, de **3 a 255** caracteres |
| Usuário | `email` | Obrigatório, formato válido, até 255 caracteres e **único** (sem diferenciar maiúsculas: `Pixel@exemplo.com` e `pixel@exemplo.com` são o mesmo e-mail) |
| Usuário | `password` | De **6 a 255** caracteres. **Obrigatória no cadastro**. No PUT é opcional: para manter a senha atual, **não envie o campo** (ou envie `null`). Enviar `""` dá **400** (menos de 6 caracteres) |
| Usuário | `bio` | Opcional, até **255** caracteres (vai para o perfil) |
| Perfil | `bio` | Obrigatória (pode ser `""`), até **255** caracteres |
| Login | `email`, `password` | Obrigatórios; o `email` precisa ter formato válido |

- O `id`, o `createdAt` e o `updatedAt` são gerados pela API: não precisam ser enviados (e são ignorados se forem).
- A senha é guardada como hash (BCrypt) e **nunca aparece** nas respostas.

---

## 👤 Contas, perfis e login

- **Nenhum usuário vem cadastrado.** Crie a sua conta em `POST /api/user/v1` (ou em **Minha conta**, no site).
- Ao criar a conta, a API **cria o perfil junto**, com a `bio` enviada.
- O login (`POST /api/auth/login`) devolve `apiKey`, `userId`, `name` e `email`. Guarde a `apiKey`.
- O logout (`POST /api/auth/logout`, com `X-API-Key`) invalida a chave. Um novo login também troca a chave.
- Excluir a sua conta (`DELETE /api/user/v1/{id}`) apaga o **perfil junto**.
- O perfil que pertence a uma conta não pode ser excluído sozinho (**409**): exclua a conta.
- `POST /api/userprofile/v1` cria um **perfil avulso**, sem dono. Como não tem dono, ninguém consegue alterá-lo ou excluí-lo depois (**403**).

---

## ✅ O que você pode fazer

- Listar, buscar e ver detalhes de tudo **sem login** (GET é público).
- Cadastrar (POST) **sem login**, desde que envie a `X-Idempotency-Key`.
- Alterar (PUT) e deletar (DELETE) **com login** (`X-API-Key`). Games, categorias, desenvolvedores e plataformas podem ser alterados por qualquer usuário logado; **contas e perfis, só pelo próprio dono**.
- Navegar pela API seguindo os `_links` de cada resposta (HATEOAS): de um game para o desenvolvedor dele, de uma categoria para os games dela, da v1 para a v2...
- Reenviar um POST com a mesma `X-Idempotency-Key` sem medo de duplicar o registro.

---

## 📬 Todos os códigos de resposta

A API usa **3 códigos de sucesso** (2xx) e **9 códigos de erro** (4xx e 5xx). Ela não usa códigos 1xx (informativos) nem 3xx (redirecionamento).

| Código | Nome | Quando aparece | Exemplo |
|---|---|---|---|
| **200** | OK | Consulta (GET), atualização (PUT) e login | `GET /api/category/v1/1` |
| **201** | Created | Cadastro feito (POST) | `POST /api/category/v1` |
| **204** | No Content | Exclusão (DELETE) e logout. A resposta **não tem corpo** | `DELETE /api/category/v1/3` |
| **400** | Bad Request | Dados inválidos, JSON mal formatado, header ou parâmetro ausente, ID não numérico | `POST /api/category/v1` com `"name": "AB"` |
| **401** | Unauthorized | PUT ou DELETE sem `X-API-Key` válida, ou login errado | `DELETE /api/category/v1/1` sem `X-API-Key` |
| **403** | Forbidden | Alterar ou excluir a conta ou o perfil de **outro** usuário | `DELETE /api/user/v1/2` logado como o usuário 1 |
| **404** | Not Found | ID que não existe, ou rota que não existe | `GET /api/category/v1/99` |
| **405** | Method Not Allowed | Método que a rota não tem | `DELETE /api/category/v2/1` |
| **409** | Conflict | `X-Idempotency-Key` já usada, ou excluir um registro em uso | `DELETE /api/category/v1/1` (categoria com games) |
| **415** | Unsupported Media Type | Corpo enviado sem `Content-Type: application/json` | `POST /api/category/v1` com `Content-Type: text/plain` |
| **429** | Too Many Requests | Mais de 20 requisições por minuto vindas do mesmo IP | A 21ª requisição dentro do mesmo minuto |
| **500** | Internal Server Error | Erro inesperado no servidor | Não deve acontecer no uso normal |

### ✅ Sucesso (2xx)

**200 OK**: consultar uma categoria (os `_links` estão resumidos).

`GET /api/category/v1/1`
```json
{
  "id": 1,
  "name": "RPG",
  "createdAt": "2026-11-06T15:45:00",
  "updatedAt": null,
  "_links": {
    "self": { "href": "http://localhost:8080/api/category/v1/1", "type": "GET" },
    "update": { "href": "http://localhost:8080/api/category/v1/1", "type": "PUT" },
    "delete": { "href": "http://localhost:8080/api/category/v1/1", "type": "DELETE" }
  }
}
```
Também devolvem **200**: as listagens paginadas (`GET /api/category/v1`, com `_embedded`, `_links` e `page`), o `PUT` (devolve o registro já alterado) e o `POST /api/auth/login`:
```json
{
  "apiKey": "9b1c2f4e-6a7d-4c3b-8e2f-0a1b2c3d4e5f",
  "userId": 1,
  "name": "Jogador Pixel",
  "email": "jogador.pixel@exemplo.com",
  "message": "Logado. Envie a apiKey no header X-API-Key para usar os PUT e DELETE."
}
```

**201 Created**: cadastrar uma categoria.

`POST /api/category/v1` com o header `X-Idempotency-Key: 5d6f0c8a-2b1e-4f7a-9c3d-8e4b2a1f6c09` e o corpo `{ "name": "Plataforma 2D" }`
```json
{
  "id": 4,
  "name": "Plataforma 2D",
  "createdAt": "2026-11-17T21:30:00",
  "updatedAt": null,
  "_links": {
    "self": { "href": "http://localhost:8080/api/category/v1/4", "type": "GET" }
  }
}
```
A resposta traz o registro criado, já com o `id` gerado pela API (os `_links` estão resumidos).

**204 No Content**: excluir uma categoria sem games.

`DELETE /api/category/v1/4` com o header `X-API-Key: 9b1c2f4e-6a7d-4c3b-8e2f-0a1b2c3d4e5f`

A resposta vem **sem corpo**: o 204 já confirma que a exclusão foi feita. O `POST /api/auth/logout` também devolve 204.

### ⛔ Erros (4xx e 5xx)

Todos os erros têm o mesmo formato, com `timestamp`, `message` e `details`. A única exceção é o **429**, que vem do filtro de limite de requisições e usa o campo `error`.

**400 Bad Request**: `POST /api/category/v1` com `{ "name": "AB" }`
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "name: O name da categoria deve ter entre 3 e 255 caracteres", "details": "uri=/api/category/v1" }
```

**401 Unauthorized**: `DELETE /api/category/v1/1` sem o header `X-API-Key` (num PUT, o corpo é validado antes: com corpo inválido, o erro é 400)
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "Esta operação exige login: envie o header X-API-Key (obtenha a chave em POST /api/auth/login)", "details": "uri=/api/category/v1/1" }
```

**403 Forbidden**: `DELETE /api/user/v1/2` com a `X-API-Key` do usuário 1
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "Você só pode alterar ou excluir a sua própria conta", "details": "uri=/api/user/v1/2" }
```

**404 Not Found**: `GET /api/category/v1/99`
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "Categoria não encontrada, ID: 99", "details": "uri=/api/category/v1/99" }
```
Uma rota que não existe (ex.: `GET /api/categoria`) também dá 404, com a mensagem "Rota não encontrada: confira o endereço e a versão (/v1 ou /v2)".

**405 Method Not Allowed**: `DELETE /api/category/v2/1` (a v2 de categorias só tem consulta)
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "O método DELETE não é suportado nesta rota", "details": "uri=/api/category/v2/1" }
```

**409 Conflict**: dois casos.

1. Reenviar um `POST /api/category/v1` com uma `X-Idempotency-Key` já usada:
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "Esta X-Idempotency-Key já foi usada: o registro já foi criado (id 4) e nada foi duplicado. Para um cadastro novo, envie uma chave nova", "details": "uri=/api/category/v1" }
```
2. `DELETE /api/category/v1/1`, sendo que a categoria ainda tem games:
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "O registro está em uso por outro recurso (ou já existe) e a operação não pode ser feita", "details": "uri=/api/category/v1/1" }
```

**415 Unsupported Media Type**: `POST /api/category/v1` com o header `Content-Type: text/plain`
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "Content-Type não suportado: envie o corpo como application/json", "details": "uri=/api/category/v1" }
```

**429 Too Many Requests**: a 21ª requisição dentro do mesmo minuto
```json
{ "error": "Muitas requisições. Tente novamente em 42s" }
```
A resposta também traz o header `Retry-After: 42`, com os segundos que faltam para liberar.

**500 Internal Server Error**: erro inesperado
```json
{ "timestamp": "2026-11-17T21:30:00.000+00:00", "message": "Erro interno no servidor, tente novamente mais tarde", "details": "uri=/api/..." }
```
A mensagem é genérica de propósito: o detalhe técnico fica só no log do servidor, para não expor informações internas.

---

## ⛔ O que NÃO pode (e o erro que você recebe)

Todos os erros vêm no mesmo formato:
```json
{ "timestamp": "2026-11-12T17:45:00.000+00:00", "message": "explicação do erro", "details": "uri=/api/..." }
```

| Status | Situação | Como resolver |
|---|---|---|
| **400** | Campo obrigatório vazio ou ausente (ex.: `name` em branco) | Preencha o campo indicado na `message` |
| **400** | Nome de campo errado (ex.: `"naem"` no lugar de `"name"`) | O campo certo fica vazio e a validação reclama; corrija o nome |
| **400** | Tamanho inválido: categoria com menos de 3 caracteres, plataforma com mais de 50, usuário com menos de 3, senha com menos de 6, bio com mais de 255 | Ajuste o tamanho do texto |
| **400** | E-mail em formato inválido ou **já cadastrado** | Use outro e-mail (fictício) |
| **400** | Cadastro de usuário **sem senha**, ou `password` vazia (`""`) num PUT | No cadastro, envie a `password`; no PUT, tire o campo para manter a senha atual |
| **400** | `status` diferente de `DEVELOPMENT`, `EARLY_ACCESS` ou `RELEASED` | Use um dos três valores, em maiúsculas |
| **400** | `totalAchievements` negativo, acima de 10000 ou ausente (v2) | Envie um número de 0 a 10000 |
| **400** | JSON mal formatado (vírgula sobrando, aspas faltando, texto no lugar de número) | Confira a sintaxe do JSON |
| **400** | POST sem o header `X-Idempotency-Key` | Envie o header com um valor único |
| **400** | ID não numérico na URL (ex.: `/api/game/v1/abc`) | Use um número |
| **400** | Busca sem o parâmetro (ex.: `/search` sem `?name=`) | Envie o parâmetro |
| **400** | `sort` com um campo que não existe (ex.: `sort=nome,asc`) | Use um dos campos da tabela da seção **Paginação e ordenação** |
| **400** | Status inválido no filtro (ex.: `/api/game/v1/status/LANCADO`) | Use `DEVELOPMENT`, `EARLY_ACCESS` ou `RELEASED` |
| **401** | PUT ou DELETE **sem** `X-API-Key` | Faça login e envie a chave |
| **401** | Chave antiga: depois de um **novo login** ou de um **logout**, a chave anterior deixa de valer | Use a chave do último login |
| **401** | Login com e-mail ou senha errados | Confira os dados |
| **403** | Alterar ou excluir a conta de **outro** usuário | Cada usuário só altera e exclui a própria conta |
| **403** | Alterar ou excluir o perfil de **outro** usuário, ou um perfil avulso (sem dono) | Cada usuário só altera o próprio perfil |
| **404** | ID que não existe (inclusive `developerId`, `categoryId` ou algum `platformIds` de um game) | Consulte a listagem e use um ID existente |
| **404** | Rota que não existe ou sem a versão (ex.: `/api/category` sem `/v1`) | Use `/v1` ou `/v2` |
| **405** | Método que a rota não tem (ex.: `DELETE /api/category/v2/1` ou `DELETE /api/game/v2/1`) | A v2 de categorias é só consulta e a v2 de games não tem DELETE: para isso, use a v1 |
| **409** | POST com uma `X-Idempotency-Key` **já usada** (o cadastro já tinha sido feito) | Nada foi duplicado. Para um cadastro novo, envie uma chave nova |
| **409** | Deletar categoria, desenvolvedor ou plataforma que ainda tem games | Delete ou altere os games antes |
| **409** | Deletar o seu próprio perfil (ele pertence à sua conta) | Exclua a sua conta: o perfil vai junto |
| **415** | Corpo enviado sem `Content-Type: application/json` | Envie o header |
| **429** | Mais de **20 requisições por minuto** do mesmo IP | Espere os segundos do header `Retry-After` |
| **500** | Erro inesperado no servidor | Tente de novo; se continuar, verifique o log |

**Cuidados importantes:**
- ⚠️ **Não reutilize** uma `X-Idempotency-Key` para um cadastro diferente: a API responde **409** e o novo registro **não** é criado.
- ⚠️ A mesma chave de idempotência usada na v1 e na v2 de games conta como chaves separadas.
- ⚠️ O banco é **em memória (H2)**: ao reiniciar a API, **tudo volta aos dados de exemplo**, as contas criadas são apagadas e as chaves de login e de idempotência deixam de valer.
- ⚠️ No máximo **100 itens por página**: para ver mais, navegue pelas páginas (`page=1`, `page=2`...) ou siga o link `next`.
- ⚠️ Cada usuário tem **uma** chave de API por vez: um novo login invalida a anterior.
- ⚠️ Contas e perfis são pessoais: com a sua chave você só altera e exclui a **sua** conta e o **seu** perfil.
- ⚠️ Num PUT, o corpo é validado **antes** da chave: um PUT com corpo inválido recebe **400** mesmo sem `X-API-Key`. Com o corpo válido e sem chave, a resposta é **401**.
- ⚠️ Não há DELETE em cascata: apagar um registro em uso dá **409**.
- ⚠️ Use sempre **dados fictícios**. Nunca cadastre seu nome, e-mail ou senha reais.
