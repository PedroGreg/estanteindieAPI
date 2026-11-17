package br.com.estanteindie.config;

import br.com.estanteindie.model.*;
import br.com.estanteindie.repository.CategoryRepository;
import br.com.estanteindie.repository.DeveloperRepository;
import br.com.estanteindie.repository.GameRepository;
import br.com.estanteindie.repository.PlatformRepository;
import br.com.estanteindie.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final CategoryRepository categoryRepository;
    private final DeveloperRepository developerRepository;
    private final PlatformRepository platformRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(CategoryRepository categoryRepository, DeveloperRepository developerRepository,
                      PlatformRepository platformRepository, GameRepository gameRepository,
                      UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.categoryRepository = categoryRepository;
        this.developerRepository = developerRepository;
        this.platformRepository = platformRepository;
        this.gameRepository = gameRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        LocalDateTime now = LocalDateTime.now();

        Category rpg = categoryRepository.save(new Category(null, now, "RPG"));
        Category metroidvania = categoryRepository.save(new Category(null, now, "Metroidvania"));
        Category roguelike = categoryRepository.save(new Category(null, now, "Roguelike"));

        Developer tobyFox = developer("Toby Fox", now);
        Developer teamCherry = developer("Team Cherry", now);
        Developer supergiant = developer("Supergiant Games", now);

        Platform pc = platform("PC (Steam)", now);
        Platform sw = platform("Nintendo Switch", now);
        Platform ps = platform("PlayStation 5", now);

        saveGame(new Game("Undertale", GameStatus.RELEASED, tobyFox, rpg, new ArrayList<>(List.of(pc, sw)), now, null), 0);
        saveGame(new Game("Deltarune", GameStatus.EARLY_ACCESS, tobyFox, rpg, new ArrayList<>(List.of(pc, sw, ps)), now, null), 0);
        saveGame(new Game("Hollow Knight", GameStatus.RELEASED, teamCherry, metroidvania, new ArrayList<>(List.of(pc, sw, ps)), now, null), 63);
        saveGame(new Game("Hades", GameStatus.RELEASED, supergiant, roguelike, new ArrayList<>(List.of(pc, sw, ps)), now, null), 49);

        saveUser("Administrador", "admin@estanteindie.com", "admin123", "Conta de testes da API", now);
        saveUser("Marina Pixel", "marina@estanteindie.com", "senha123", "Fã de metroidvanias e pixel art", now);
        saveUser("Caio Retrô", "caio@estanteindie.com", "senha123", "Coleciono roguelikes e jogos de ritmo", now);

        log.info("DataSeeder: dados de exemplo criados. Login de teste -> admin@estanteindie.com / admin123 (também marina@ e caio@estanteindie.com / senha123)");
    }

    private void saveUser(String name, String email, String password, String bio, LocalDateTime now) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setCreatedAt(now);
        UserProfile profile = new UserProfile();
        profile.setBio(bio);
        profile.setCreatedAt(now);
        profile.setUser(user);
        user.setUserProfile(profile);
        userRepository.save(user);
    }

    private void saveGame(Game game, int totalAchievements) {
        game.setTotalAchievements(totalAchievements);
        gameRepository.save(game);
    }

    private Developer developer(String name, LocalDateTime now) {
        Developer developer = new Developer();
        developer.setName(name);
        developer.setCreatedAt(now);
        return developerRepository.save(developer);
    }

    private Platform platform(String name, LocalDateTime now) {
        Platform platform = new Platform();
        platform.setName(name);
        platform.setCreatedAt(now);
        return platformRepository.save(platform);
    }
}
