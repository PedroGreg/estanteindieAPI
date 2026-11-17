package br.com.estanteindie.config;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenAPI {

    @Bean
    public io.swagger.v3.oas.models.OpenAPI customOpenAPI(@Value("${springdoc.version:2.0}") String appVersion) {
        return new io.swagger.v3.oas.models.OpenAPI()
                .info(new Info()
                        .title("EstanteIndie API")
                        .version(appVersion)
                        .description("API REST para gerenciar um catálogo de games indie: desenvolvedores, categorias, plataformas, games, usuários e perfis. " +
                                "Listagens paginadas: page começa em 0; size padrão 10, mínimo 1 e máximo 100; sort no formato campo,asc ou campo,desc. " +
                                "O guia de uso completo, com exemplos e a lista de erros, está em /guia.html.")
                        .termsOfService("/termos.html")
                        .license(new License().name("MIT").url("https://mit-license.org/"))
                        .contact(new Contact()
                                .name("TSI - SENAC")
                                .url("https://www.senac.com.br")
                                .email("pedro.jcgregorio@senacsp.edu.br")))
                .externalDocs(new ExternalDocumentation()
                        .description("Guia completo de uso da API")
                        .url("/guia.html"))
                .tags(List.of(
                        new Tag().name("Autenticação").description("Login e logout. O login gera a chave X-API-Key, exigida em todos os PUT e DELETE."),
                        new Tag().name("Categorias | v1").description("Categorias (gêneros) dos games."),
                        new Tag().name("Desenvolvedores | v1").description("Estúdios ou pessoas que desenvolvem os games."),
                        new Tag().name("Plataformas | v1").description("Plataformas onde os games estão disponíveis."),
                        new Tag().name("Games | v1").description("Games indie com desenvolvedor, categoria, plataformas e status."),
                        new Tag().name("Usuários | v1").description("Usuários. O cadastro cria o perfil junto; a senha é guardada como hash BCrypt e nunca é devolvida."),
                        new Tag().name("Perfis de Usuário | v1").description("Perfis (bio) dos usuários. O perfil é criado junto no cadastro do usuário."),
                        new Tag().name("Categorias | v2").description("Categorias com a quantidade de games (gamesCount). Só consulta."),
                        new Tag().name("Games | v2").description("Games resumidos e com o total de conquistas (totalAchievements). Consulta, cadastro e alteração.")
                ));
    }
}
