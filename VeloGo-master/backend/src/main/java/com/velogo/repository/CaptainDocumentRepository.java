package com.velogo.repository;

import com.velogo.domain.CaptainDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CaptainDocumentRepository extends JpaRepository<CaptainDocument, String> {
    List<CaptainDocument> findByCaptainId(String captainId);
}
