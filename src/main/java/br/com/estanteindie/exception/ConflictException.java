package br.com.estanteindie.exception;

// =====================================================================================================
// ConflictException = "o pedido é válido, mas entra em conflito com o estado atual dos dados" -> HTTP 409.
// =====================================================================================================
//
// Diferença para as outras exceções:
//   - 400 (BadRequestException): o pedido em si está errado (campo vazio, formato inválido...).
//   - 403 (ForbiddenException):  o pedido está certo, mas você não tem permissão.
//   - 409 (ConflictException):   o pedido está certo e você tem permissão, mas os dados atuais impedem a operação.
//
// Onde é lançada:
//   1) No IdempotencyService.checkNotUsed(...), chamado no início de todo POST de cadastro. Se a X-Idempotency-Key
//      já foi usada para aquele recurso, o cadastro já foi feito antes: a API não cria outro registro e responde 409,
//      com o id do registro original na mensagem. É o código certo porque o pedido entra em conflito com algo que
//      já aconteceu (a chave já foi consumida). A garantia da idempotência continua: repetir o POST nunca duplica nada.
//   2) No UserProfileService.delete(...). Todo perfil que tem dono pertence a uma conta
// (relação 1:1 com User). Apagar só o perfil deixaria a conta apontando para um registro que não existe,
// então a API recusa e orienta a excluir a conta, que leva o perfil junto (cascade):
//
//     throw new ConflictException("O perfil pertence à sua conta e não pode ser excluído sozinho. ...");
//
// Por que lançar a exceção em vez de deixar o banco recusar? Porque a conta (User) está carregada na mesma
// transação e tem cascade sobre o perfil: na hora de gravar, o Hibernate pode "desfazer" a exclusão em
// silêncio, e a API responderia 204 sem ter apagado nada. Conferindo a regra aqui, o resultado é sempre
// o mesmo, e a mensagem é clara.
//
// Os outros 409 do projeto (apagar categoria, desenvolvedor ou plataforma que ainda tem games) vêm do
// próprio banco, pela DataIntegrityViolationException, e são tratados no ExceptionHandlerModel.
// =====================================================================================================
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
