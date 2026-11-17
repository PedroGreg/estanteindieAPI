package br.com.estanteindie.service;

import br.com.estanteindie.dto.request.UserProfileRequestDTO;
import br.com.estanteindie.exception.ForbiddenException;
import br.com.estanteindie.exception.NotFoundException;
import br.com.estanteindie.model.UserProfile;
import br.com.estanteindie.repository.UserProfileRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class UserProfileService {

    private final UserProfileRepository repository;

    public UserProfileService(UserProfileRepository repository){
        this.repository = repository;
    }

    public Page<UserProfile> findAll(Pageable pageable){
        return repository.findAll(pageable);
    }

    public UserProfile findById(Long id){
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Perfil de usuário não encontrado, ID: " + id));
    }

    public Page<UserProfile> searchByBio(String text, Pageable pageable){
        return repository.searchByBio(text, pageable);
    }

    @Transactional
    public UserProfile create(UserProfileRequestDTO dto){
        UserProfile userProfile = new UserProfile();
        userProfile.setBio(dto.bio());
        userProfile.setCreatedAt(LocalDateTime.now());
        return repository.save(userProfile);
    }

    @Transactional
    public UserProfile update(Long id, UserProfileRequestDTO dto, Long currentUserId){
        UserProfile updateUserProfile = findById(id);
        checkOwner(updateUserProfile, currentUserId);
        updateUserProfile.setBio(dto.bio());
        updateUserProfile.setUpdatedAt(LocalDateTime.now());
        return updateUserProfile;
    }

    @Transactional
    public void delete(Long id, Long currentUserId){
        UserProfile userProfile = findById(id);
        checkOwner(userProfile, currentUserId);
        repository.delete(userProfile);
        repository.flush();
    }

    private void checkOwner(UserProfile userProfile, Long currentUserId){
        if (userProfile.getUser() == null || !userProfile.getUser().getId().equals(currentUserId)) {
            throw new ForbiddenException("Você só pode alterar ou excluir o seu próprio perfil");
        }
    }
}
