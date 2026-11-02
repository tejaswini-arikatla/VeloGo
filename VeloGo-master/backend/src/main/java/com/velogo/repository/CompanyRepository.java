package com.velogo.repository;

import com.velogo.domain.Company;
import com.velogo.domain.enums.CompanyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, String> {

    Optional<Company> findByContactEmail(String contactEmail);

    Optional<Company> findByDomain(String domain);

    Optional<Company> findByDomainIgnoreCaseAndStatus(String domain, CompanyStatus status);

    java.util.List<Company> findByStatus(CompanyStatus status);

    Optional<Company> findByIdAndStatus(String id, CompanyStatus status);

    @Modifying
    @Query("UPDATE Company c SET c.usedCredit = c.usedCredit + :amount, c.updatedAt = CURRENT_TIMESTAMP WHERE c.id = :companyId")
    int incrementUsedCredit(@Param("companyId") String companyId, @Param("amount") BigDecimal amount);
}
