package iaf.ofek.sigma.ai.dto;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class LoginUserDto {

    @NotNull(message = "can't be null")
    private String username;

    @NotNull(message = "can't be null")
    private String password;

}
