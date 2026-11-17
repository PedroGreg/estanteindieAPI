# EstanteIndie API — mapa do projeto

Com a API rodando:
- **Front-end do usuário:** http://localhost:8080/ (catálogo, cadastros, edição, exclusão, login e conta)
- **Swagger (com o tema do projeto):** http://localhost:8080/swagger-ui/index.html
- **Guia de uso** (exemplos, erros e regras): http://localhost:8080/guia.html
- **Termos de Serviço:** http://localhost:8080/termos.html
- **Console do H2:** http://localhost:8080/h2-console (JDBC `jdbc:h2:mem:estanteindie`, usuário `sa`, sem senha)

Nenhum usuário vem cadastrado: crie uma conta com dados fictícios (`POST /api/user/v1` ou **Minha conta** no site) antes de testar PUT e DELETE.

| Requisito | Onde olhar |
|---|---|
| One-to-One | `User.userProfile` ↔ `UserProfile.user` |
| One-to-Many | `Developer.games`, `Category.games` |
| Many-to-Many | `Game.platforms` |
| Enum | `GameStatus` |
| Bean Validation | entidades (`model/`) e `dto/request/` |
| Consultas personalizadas | `GameRepository`, `UserProfileRepository` (`@Query`) |
| Paginação + HATEOAS | controllers (`PagedResourcesAssembler`, `@PageableDefault(size = 10)`), `config/PaginationConfig` (máximo de 100 por página) e `assembler/` |
| Idempotência (`X-Idempotency-Key`) | `IdempotencyService` + método `create` dos controllers |
| Login (`X-API-Key` em PUT e DELETE) | `AuthController`, `AuthService` + métodos `update` e `delete` |
| Rate limiting | `config/RateLimitFilter` (20 req/min por IP, só em `/api/**`) |
| CORS | `config/CorsConfig` + `app.cors.allowed-origins` |
| Versionamento (URL) | `/api/{recurso}/v1` e `/api/category/v2`, `/api/game/v2` |
| Tratamento de erros | pasta `exception/` (comentada em detalhes) |
| Front-end | `static/index.html` + `static/app/` (`main.js`, `api.js`, `ui.js`, `pages/`) |
| Documentação | `config/OpenAPI` (especificação), `static/swagger-ui/index.html` + `controller/SwaggerPageController` (página do Swagger com o tema), `static/guia.md` (texto do guia), `static/termos.html` |
