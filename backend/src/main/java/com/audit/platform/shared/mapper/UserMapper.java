package com.audit.platform.shared.mapper;

import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.dto.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "createdById", source = "createdBy.id")
    UserResponse toResponse(User user);
}
