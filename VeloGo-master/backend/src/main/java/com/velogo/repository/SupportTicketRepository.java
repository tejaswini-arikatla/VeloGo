package com.velogo.repository;

import com.velogo.domain.SupportTicket;
import com.velogo.domain.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(String userId);
    Page<SupportTicket> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<SupportTicket> findByStatusOrderByCreatedAtDesc(TicketStatus status, Pageable pageable);
    long countByStatus(TicketStatus status);
}
