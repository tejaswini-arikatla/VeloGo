package com.velogo.repository;

import com.velogo.domain.CompanyMember;
import com.velogo.domain.enums.CompanyMemberRole;
import com.velogo.domain.enums.CompanyMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyMemberRepository extends JpaRepository<CompanyMember, String> {

    Optional<CompanyMember> findFirstByUserIdOrderByCreatedAtDesc(String userId);

    default Optional<CompanyMember> findByUserId(String userId) {
        return findFirstByUserIdOrderByCreatedAtDesc(userId);
    }

    Optional<CompanyMember> findFirstByUserIdAndStatusOrderByCreatedAtDesc(String userId, CompanyMemberStatus status);

    default Optional<CompanyMember> findByUserIdAndStatus(String userId, CompanyMemberStatus status) {
        return findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, status);
    }

    Optional<CompanyMember> findFirstByCompanyIdAndUserIdOrderByCreatedAtDesc(String companyId, String userId);

    default Optional<CompanyMember> findByCompanyIdAndUserId(String companyId, String userId) {
        return findFirstByCompanyIdAndUserIdOrderByCreatedAtDesc(companyId, userId);
    }

    List<CompanyMember> findByCompanyId(String companyId);

    List<CompanyMember> findByCompanyIdAndRole(String companyId, CompanyMemberRole role);

    @Modifying
    @Query("UPDATE CompanyMember cm SET cm.currentMonthSpent = cm.currentMonthSpent + :amount, cm.updatedAt = CURRENT_TIMESTAMP WHERE cm.id = :memberId")
    int incrementMonthlySpent(@Param("memberId") String memberId, @Param("amount") BigDecimal amount);
}
