package com.velogo.repository;

import com.velogo.domain.CorporateInvoice;
import com.velogo.domain.enums.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CorporateInvoiceRepository extends JpaRepository<CorporateInvoice, String> {

    List<CorporateInvoice> findByCompanyIdOrderByBillingPeriodEndDesc(String companyId);

    List<CorporateInvoice> findByStatus(InvoiceStatus status);

    Optional<CorporateInvoice> findByInvoiceNumber(String invoiceNumber);
}
