package com.velogo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller to forward SPA client-side routes to index.html when served from Spring Boot.
 */
@Controller
public class SpaController {

    @GetMapping(value = {
            "/book",
            "/login",
            "/register",
            "/safety",
            "/customer/**",
            "/captain/**",
            "/admin/**",
            "/subscriptions/**",
            "/corporate/**"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
