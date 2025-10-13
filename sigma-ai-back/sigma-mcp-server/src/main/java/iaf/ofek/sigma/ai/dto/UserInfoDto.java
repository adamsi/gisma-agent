package iaf.ofek.sigma.ai.dto;

import iaf.ofek.sigma.ai.entity.Role;
import lombok.Data;

@Data
public class UserInfoDto {

    private String username;

    private String email;

    private String picture;

    private Role role;

}
