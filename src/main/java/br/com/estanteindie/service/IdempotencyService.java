package br.com.estanteindie.service;

import br.com.estanteindie.exception.ConflictException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IdempotencyService {

    private final Map<String, Long> processedKeys = new ConcurrentHashMap<>();

    public Long findCreatedId(String resource, String idempotencyKey) {
        return processedKeys.get(resource + ":" + idempotencyKey);
    }

    public void checkNotUsed(String resource, String idempotencyKey) {
        Long createdId = findCreatedId(resource, idempotencyKey);
        if (createdId != null) {
            throw new ConflictException("Esta X-Idempotency-Key já foi usada: o registro já foi criado (id " + createdId
                    + ") e nada foi duplicado. Para um cadastro novo, envie uma chave nova");
        }
    }

    public void register(String resource, String idempotencyKey, Long createdId) {
        processedKeys.put(resource + ":" + idempotencyKey, createdId);
    }
}
