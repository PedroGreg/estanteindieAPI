package br.com.estanteindie.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(name = "LoginRequestDTO", example = "{\"email\": \"jogador.pixel@exemplo.com\", \"password\": \"senha123\"}")
public record LoginRequestDTO(
        @NotBlank(message = "O email deve ser preenchido")
        @Email(message = "O email informado não é válido")
        String email,

        @NotBlank(message = "A password deve ser preenchida")
        String password
) {
}
