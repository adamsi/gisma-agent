package iaf.ofek.gisma.ai.mapper;

import iaf.ofek.gisma.ai.dto.auth.UserInfoDto;
import iaf.ofek.gisma.ai.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserInfoDto toDto(User user);

}
