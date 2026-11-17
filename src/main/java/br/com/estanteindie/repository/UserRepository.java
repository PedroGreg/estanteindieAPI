package br.com.estanteindie.repository;

import br.com.estanteindie.model.User;

import java.util.Optional;

public interface UserRepository extends BaseRepository<User> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByApiKey(String apiKey);
}
