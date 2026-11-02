package com.velogo.repository;

import com.velogo.domain.ServiceArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceAreaRepository extends JpaRepository<ServiceArea, String> {
    List<ServiceArea> findAllByActiveTrue();
}
