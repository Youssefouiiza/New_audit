package com.audit.platform.shared.mapper;

import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.dto.AuditResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuditMapper {

    @Mapping(target = "clientId",   source = "client.id")
    @Mapping(target = "auditorId",  source = "auditor.id")
    @Mapping(target = "managerId",  source = "manager.id")
    @Mapping(target = "clientName", source = "client.fullName")
    @Mapping(target = "auditorName",source = "auditor.fullName")
    AuditResponse toResponse(Audit audit);
}
