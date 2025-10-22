package iaf.ofek.gisma.ai.dto.auth;

import iaf.ofek.gisma.ai.entity.Role;
import lombok.Data;

@Data
public class UserInfoDto {

    private String username;

    private String email;

    private String picture;

    private Role role;

}
