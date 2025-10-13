package iaf.ofek.sigma.ai.mapper;

import iaf.ofek.sigma.ai.dto.UserInfoDto;
import iaf.ofek.sigma.ai.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserInfoDto toDto(User user);

}
