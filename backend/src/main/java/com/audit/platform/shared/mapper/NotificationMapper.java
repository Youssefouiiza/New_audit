package com.audit.platform.shared.mapper;

import com.audit.platform.modules.notification.domain.Notification;
import com.audit.platform.modules.notification.dto.NotificationResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    NotificationResponse toResponse(Notification notification);
}
