package com.geoeconwars.users.api;

import com.geoeconwars.auth.service.CurrentActorService;
import com.geoeconwars.users.service.UserProfileService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final CurrentActorService currentActorService;
    private final UserProfileService userProfileService;

    public UserController(CurrentActorService currentActorService, UserProfileService userProfileService) {
        this.currentActorService = currentActorService;
        this.userProfileService = userProfileService;
    }

    @GetMapping("/me")
    public UserProfileService.ProfileView me(Authentication authentication) {
        return userProfileService.buildProfile(currentActorService.require(authentication));
    }
}
