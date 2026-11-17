package br.com.estanteindie.service;

import br.com.estanteindie.dto.request.DeveloperRequestDTO;
import br.com.estanteindie.exception.NotFoundException;
import br.com.estanteindie.model.Developer;
import br.com.estanteindie.repository.DeveloperRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class DeveloperService {

    private final DeveloperRepository repository;

    public DeveloperService(DeveloperRepository repository){
        this.repository = repository;
    }

    public Page<Developer> findAll(Pageable pageable){
        return repository.findAll(pageable);
    }

    public Developer findById(Long id){
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Desenvolvedor não encontrado, ID: " + id));
    }

    @Transactional
    public Developer create(DeveloperRequestDTO dto){
        Developer developer = new Developer();
        developer.setName(dto.name());
        developer.setCreatedAt(LocalDateTime.now());
        return repository.save(developer);
    }

    @Transactional
    public Developer update(Long id, DeveloperRequestDTO dto){
        Developer updateDeveloper = findById(id);
        updateDeveloper.setName(dto.name());
        updateDeveloper.setUpdatedAt(LocalDateTime.now());
        return updateDeveloper;
    }

    public Page<Developer> findByName(String name, Pageable pageable){
        return repository.findByNameContainingIgnoreCase(name, pageable);
    }

    @Transactional
    public void delete(Long id){
        Developer developer = findById(id);
        repository.delete(developer);
        repository.flush();
    }
}
