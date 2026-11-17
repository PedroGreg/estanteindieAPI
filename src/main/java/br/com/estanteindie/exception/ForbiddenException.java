package br.com.estanteindie.exception;

// =====================================================================================================
// ForbiddenException = "sei quem você é, mas você não pode fazer isso" -> HTTP 403 (Forbidden).
// =====================================================================================================
//
// Diferença entre 401 e 403:
//   - 401 (UnauthorizedException): a API NÃO sabe quem você é (sem X-API-Key, ou chave inválida).
//   - 403 (ForbiddenException):    a API SABE quem você é (a chave é válida), mas a ação não é permitida para você.
//
// Onde é lançada: no UserService e no UserProfileService, pela regra "cada usuário só altera e exclui
// a própria conta e o próprio perfil". Exemplo no UserService:
//
//     if (!user.getId().equals(currentUserId)) {
//         throw new ForbiddenException("Você só pode alterar ou excluir a sua própria conta");
//     }
//
//   - currentUserId é o id do dono da X-API-Key enviada (o controller pega com authService.validate(apiKey).getId());
//   - se o id da URL for de outra pessoa, a exceção interrompe o método antes de qualquer alteração no banco.
//
// Como as outras exceções do projeto, estende RuntimeException e "sobe" até o ExceptionHandlerModel,
// que a transforma no JSON padrão com status 403 (ver o método forbidden(...) lá).
// =====================================================================================================
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
