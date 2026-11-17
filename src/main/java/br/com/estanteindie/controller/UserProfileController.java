package br.com.estanteindie.controller;

import br.com.estanteindie.assembler.UserProfileModelAssembler;
import br.com.estanteindie.dto.request.UserProfileRequestDTO;
import br.com.estanteindie.dto.response.UserProfileResponseDTO;
import br.com.estanteindie.exception.ExceptionResponseModel;
import br.com.estanteindie.model.UserProfile;
import br.com.estanteindie.service.AuthService;
import br.com.estanteindie.service.IdempotencyService;
import br.com.estanteindie.service.UserProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.HateoasPageableHandlerMethodArgumentResolver;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Perfis de Usuário | v1")
@RestController
@RequestMapping("/api/userprofile/v1")
public class UserProfileController {

    private final UserProfileService service;
    private final UserProfileModelAssembler assembler;
    private final PagedResourcesAssembler<UserProfile> pagedAssembler =
            new PagedResourcesAssembler<>(new HateoasPageableHandlerMethodArgumentResolver(), null);
    private final IdempotencyService idempotencyService;
    private final AuthService authService;

    public UserProfileController(UserProfileService service, UserProfileModelAssembler assembler,
                         IdempotencyService idempotencyService, AuthService authService){
        this.service = service;
        this.assembler = assembler;
        this.idempotencyService = idempotencyService;
        this.authService = authService;
    }

    @Operation(summary = "Criar um novo perfil de usuário | v1",
            description = "Exige o header X-Idempotency-Key (ex.: um UUID). Reenviar com a mesma chave devolve 409 (Conflito) e não cria outro registro.")
    @ApiResponse(responseCode = "201", description = "Perfil de usuário criado", content = @Content(mediaType = "application/hal+json", schema = @Schema(implementation = UserProfileResponseDTO.class)))
    @ApiResponse(responseCode = "409", description = "Repetição: esta X-Idempotency-Key já foi usada. Nada é criado de novo; envie uma chave nova para outro cadastro", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "400", description = "Dados inválidos, JSON mal formatado ou header X-Idempotency-Key ausente", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @PostMapping()
    public ResponseEntity<EntityModel<UserProfileResponseDTO>> create(
            @Parameter(description = "Valor único deste cadastro (ex.: um UUID novo)", example = "3f2b8c1e-7d4a-4e9b-a6c2-1f0e9d8b7a65")
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Novo perfil de usuário", required = true,
                    content = @Content(schema = @Schema(implementation = UserProfileRequestDTO.class)))
            @RequestBody @Valid UserProfileRequestDTO dto){
        idempotencyService.checkNotUsed("userprofile", idempotencyKey);
        UserProfile userProfile1 = service.create(dto);
        idempotencyService.register("userprofile", idempotencyKey, userProfile1.getId());
        return new ResponseEntity<>(assembler.toDtoModel(userProfile1), HttpStatus.CREATED);
    }

    @Operation(summary = "Buscar todos os perfis de usuário | v1", description = "Paginação: page (começa em 0), size (padrão 10) e sort (ex.: name,asc).")
    @ApiResponse(responseCode = "200", description = "Lista paginada com todos os perfis de usuário", content = @Content(mediaType = "application/hal+json", schema = @Schema(type = "object", example = UserProfileResponseDTO.PAGE_EXAMPLE)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @GetMapping()
    public ResponseEntity<PagedModel<EntityModel<UserProfileResponseDTO>>> findAll(@ParameterObject @PageableDefault(size = 10) Pageable pageable){
        Page<UserProfile> page = service.findAll(pageable);
        return ResponseEntity.ok(pagedAssembler.toModel(page, assembler::toDtoModel));
    }

    @Operation(summary = "Buscar perfil de usuário por ID | v1", description = "Retorna o perfil de usuário com os links HATEOAS para os recursos relacionados.")
    @ApiResponse(responseCode = "200", description = "Perfil de usuário encontrado", content = @Content(mediaType = "application/hal+json", schema = @Schema(implementation = UserProfileResponseDTO.class)))
    @ApiResponse(responseCode = "400", description = "ID inválido (não numérico)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "404", description = "Perfil de usuário não encontrado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @GetMapping("/{id}")
    public ResponseEntity<EntityModel<UserProfileResponseDTO>> findById(@Parameter(description = "ID do perfil de usuário", example = "1") @PathVariable Long id){
        return ResponseEntity.ok(assembler.toDtoModel(service.findById(id)));
    }

    @Operation(summary = "Buscar perfis pela bio | v1", description = "Busca perfis cuja bio contém o texto, sem diferenciar maiúsculas de minúsculas. Paginação: page (começa em 0), size (padrão 10) e sort (ex.: name,asc).")
    @ApiResponse(responseCode = "200", description = "Lista paginada com o resultado", content = @Content(mediaType = "application/hal+json", schema = @Schema(type = "object", example = UserProfileResponseDTO.PAGE_EXAMPLE)))
    @ApiResponse(responseCode = "400", description = "Parâmetro bio não enviado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @GetMapping("/search")
    public ResponseEntity<PagedModel<EntityModel<UserProfileResponseDTO>>> findByBio(
            @Parameter(description = "Texto a procurar na bio", example = "Backend") @RequestParam String bio,
            @ParameterObject @PageableDefault(size = 10) Pageable pageable){
        Page<UserProfile> page = service.searchByBio(bio, pageable);
        return ResponseEntity.ok(pagedAssembler.toModel(page, assembler::toDtoModel));
    }

    @Operation(summary = "Atualizar perfil de usuário | v1",
            description = "Exige login: envie no header X-API-Key a chave obtida em POST /api/auth/login. Cada usuário só pode alterar o próprio perfil; perfis avulsos não têm dono e não podem ser alterados.")
    @ApiResponse(responseCode = "200", description = "Perfil de usuário atualizado", content = @Content(mediaType = "application/hal+json", schema = @Schema(implementation = UserProfileResponseDTO.class)))
    @ApiResponse(responseCode = "400", description = "Dados inválidos ou JSON mal formatado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "401", description = "X-API-Key ausente ou inválida (faça login em POST /api/auth/login)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "403", description = "A chave é válida, mas você só pode alterar o seu próprio perfil", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))    @ApiResponse(responseCode = "404", description = "Perfil de usuário não encontrado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @PutMapping("/{id}")
    public ResponseEntity<EntityModel<UserProfileResponseDTO>> update(
            @Parameter(description = "ID do perfil de usuário", example = "1") @PathVariable Long id,
            @Parameter(description = "Chave obtida em POST /api/auth/login")
            @RequestHeader(value = "X-API-Key", required = false) String apiKey,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Dados atualizados do perfil de usuário", required = true,
                    content = @Content(schema = @Schema(implementation = UserProfileRequestDTO.class)))
            @RequestBody @Valid UserProfileRequestDTO dto){
        Long currentUserId = authService.validate(apiKey).getId();
        return ResponseEntity.ok(assembler.toDtoModel(service.update(id, dto, currentUserId)));
    }

    @Operation(summary = "Deletar perfil de usuário | v1",
            description = "Exige login: envie no header X-API-Key a chave obtida em POST /api/auth/login. Só é possível excluir o próprio perfil, e mesmo assim a API responde 409, porque ele pertence à sua conta: exclua a conta para apagar o perfil.")
    @ApiResponse(responseCode = "204", description = "Perfil de usuário deletado", content = @Content)
    @ApiResponse(responseCode = "401", description = "X-API-Key ausente ou inválida (faça login em POST /api/auth/login)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "403", description = "A chave é válida, mas você só pode excluir o seu próprio perfil", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))    @ApiResponse(responseCode = "409", description = "Perfil de usuário pertence a um usuário (delete o usuário, que leva o perfil junto) e não pode ser deletado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "404", description = "Perfil de usuário não encontrado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "ID do perfil de usuário", example = "1") @PathVariable Long id,
            @Parameter(description = "Chave obtida em POST /api/auth/login")
            @RequestHeader(value = "X-API-Key", required = false) String apiKey) {
        Long currentUserId = authService.validate(apiKey).getId();
        service.delete(id, currentUserId);
        return ResponseEntity.noContent().build();
    }
}
