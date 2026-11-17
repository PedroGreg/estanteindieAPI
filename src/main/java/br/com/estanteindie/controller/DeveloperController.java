package br.com.estanteindie.controller;

import br.com.estanteindie.assembler.DeveloperModelAssembler;
import br.com.estanteindie.dto.request.DeveloperRequestDTO;
import br.com.estanteindie.dto.response.DeveloperResponseDTO;
import br.com.estanteindie.exception.ExceptionResponseModel;
import br.com.estanteindie.model.Developer;
import br.com.estanteindie.service.AuthService;
import br.com.estanteindie.service.DeveloperService;
import br.com.estanteindie.service.IdempotencyService;
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

@Tag(name = "Desenvolvedores | v1")
@RestController
@RequestMapping("/api/developer/v1")
public class DeveloperController {

    private final DeveloperService service;
    private final DeveloperModelAssembler assembler;
    private final PagedResourcesAssembler<Developer> pagedAssembler =
            new PagedResourcesAssembler<>(new HateoasPageableHandlerMethodArgumentResolver(), null);
    private final IdempotencyService idempotencyService;
    private final AuthService authService;

    public DeveloperController(DeveloperService service, DeveloperModelAssembler assembler,
                         IdempotencyService idempotencyService, AuthService authService){
        this.service = service;
        this.assembler = assembler;
        this.idempotencyService = idempotencyService;
        this.authService = authService;
    }

    @Operation(summary = "Criar um novo desenvolvedor | v1",
            description = "Exige o header X-Idempotency-Key (ex.: um UUID). Reenviar com a mesma chave devolve 409 (Conflito) e não cria outro registro.")
    @ApiResponse(responseCode = "201", description = "Desenvolvedor criado", content = @Content(mediaType = "application/hal+json", schema = @Schema(implementation = DeveloperResponseDTO.class)))
    @ApiResponse(responseCode = "409", description = "Repetição: esta X-Idempotency-Key já foi usada. Nada é criado de novo; envie uma chave nova para outro cadastro", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "400", description = "Dados inválidos, JSON mal formatado ou header X-Idempotency-Key ausente", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @PostMapping()
    public ResponseEntity<EntityModel<DeveloperResponseDTO>> create(
            @Parameter(description = "Valor único deste cadastro (ex.: um UUID novo)", example = "3f2b8c1e-7d4a-4e9b-a6c2-1f0e9d8b7a65")
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Novo desenvolvedor", required = true,
                    content = @Content(schema = @Schema(implementation = DeveloperRequestDTO.class)))
            @RequestBody @Valid DeveloperRequestDTO dto){
        idempotencyService.checkNotUsed("developer", idempotencyKey);
        Developer developer1 = service.create(dto);
        idempotencyService.register("developer", idempotencyKey, developer1.getId());
        return new ResponseEntity<>(assembler.toDtoModel(developer1), HttpStatus.CREATED);
    }

    @Operation(summary = "Buscar todos os desenvolvedores | v1", description = "Paginação: page (começa em 0), size (padrão 10) e sort (ex.: name,asc).")
    @ApiResponse(responseCode = "200", description = "Lista paginada com todos os desenvolvedores", content = @Content(mediaType = "application/hal+json", schema = @Schema(type = "object", example = DeveloperResponseDTO.PAGE_EXAMPLE)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @GetMapping()
    public ResponseEntity<PagedModel<EntityModel<DeveloperResponseDTO>>> findAll(@ParameterObject @PageableDefault(size = 10) Pageable pageable){
        Page<Developer> page = service.findAll(pageable);
        return ResponseEntity.ok(pagedAssembler.toModel(page, assembler::toDtoModel));
    }

    @Operation(summary = "Buscar desenvolvedor por ID | v1", description = "Retorna o desenvolvedor com os links HATEOAS para os recursos relacionados.")
    @ApiResponse(responseCode = "200", description = "Desenvolvedor encontrado", content = @Content(mediaType = "application/hal+json", schema = @Schema(implementation = DeveloperResponseDTO.class)))
    @ApiResponse(responseCode = "400", description = "ID inválido (não numérico)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "404", description = "Desenvolvedor não encontrado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @GetMapping("/{id}")
    public ResponseEntity<EntityModel<DeveloperResponseDTO>> findById(@Parameter(description = "ID do desenvolvedor", example = "1") @PathVariable Long id){
        return ResponseEntity.ok(assembler.toDtoModel(service.findById(id)));
    }

    @Operation(summary = "Buscar desenvolvedor por nome | v1", description = "Busca desenvolvedores cujo nome contém o texto, sem diferenciar maiúsculas de minúsculas. Paginação: page (começa em 0), size (padrão 10) e sort (ex.: name,asc).")
    @ApiResponse(responseCode = "200", description = "Lista paginada com o resultado", content = @Content(mediaType = "application/hal+json", schema = @Schema(type = "object", example = DeveloperResponseDTO.PAGE_EXAMPLE)))
    @ApiResponse(responseCode = "400", description = "Parâmetro name não enviado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @GetMapping("/search")
    public ResponseEntity<PagedModel<EntityModel<DeveloperResponseDTO>>> findByName(
            @Parameter(description = "Texto a procurar no nome", example = "Toby") @RequestParam String name,
            @ParameterObject @PageableDefault(size = 10) Pageable pageable){
        Page<Developer> page = service.findByName(name, pageable);
        return ResponseEntity.ok(pagedAssembler.toModel(page, assembler::toDtoModel));
    }

    @Operation(summary = "Atualizar desenvolvedor | v1",
            description = "Exige login: envie no header X-API-Key a chave obtida em POST /api/auth/login.")
    @ApiResponse(responseCode = "200", description = "Desenvolvedor atualizado", content = @Content(mediaType = "application/hal+json", schema = @Schema(implementation = DeveloperResponseDTO.class)))
    @ApiResponse(responseCode = "400", description = "Dados inválidos ou JSON mal formatado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "401", description = "X-API-Key ausente ou inválida (faça login em POST /api/auth/login)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "404", description = "Desenvolvedor não encontrado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @PutMapping("/{id}")
    public ResponseEntity<EntityModel<DeveloperResponseDTO>> update(
            @Parameter(description = "ID do desenvolvedor", example = "1") @PathVariable Long id,
            @Parameter(description = "Chave obtida em POST /api/auth/login")
            @RequestHeader(value = "X-API-Key", required = false) String apiKey,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Dados atualizados do desenvolvedor", required = true,
                    content = @Content(schema = @Schema(implementation = DeveloperRequestDTO.class)))
            @RequestBody @Valid DeveloperRequestDTO dto){
        authService.validate(apiKey);
        return ResponseEntity.ok(assembler.toDtoModel(service.update(id, dto)));
    }

    @Operation(summary = "Deletar desenvolvedor | v1",
            description = "Exige login: envie no header X-API-Key a chave obtida em POST /api/auth/login.")
    @ApiResponse(responseCode = "204", description = "Desenvolvedor deletado", content = @Content)
    @ApiResponse(responseCode = "401", description = "X-API-Key ausente ou inválida (faça login em POST /api/auth/login)", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "409", description = "Desenvolvedor está em uso por um ou mais games e não pode ser deletado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "404", description = "Desenvolvedor não encontrado", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ExceptionResponseModel.class)))
    @ApiResponse(responseCode = "429", description = "Limite de 20 requisições por minuto excedido; aguarde os segundos do header Retry-After", content = @Content(mediaType = "application/json", schema = @Schema(type = "object", example = "{\"error\":\"Muitas requisições. Tente novamente em 30s\"}")))
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "ID do desenvolvedor", example = "1") @PathVariable Long id,
            @Parameter(description = "Chave obtida em POST /api/auth/login")
            @RequestHeader(value = "X-API-Key", required = false) String apiKey) {
        authService.validate(apiKey);
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
