package com.geoeconwars.simulations.api;

import com.geoeconwars.auth.service.CurrentActorService;
import com.geoeconwars.simulations.service.SimulationModels;
import com.geoeconwars.simulations.service.SimulationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api")
public class SimulationController {

    private final CurrentActorService currentActorService;
    private final SimulationService simulationService;

    public SimulationController(CurrentActorService currentActorService, SimulationService simulationService) {
        this.currentActorService = currentActorService;
        this.simulationService = simulationService;
    }

    @PostMapping("/simulations/war")
    public SimulationModels.SimulationView createSimulation(@Valid @RequestBody CreateSimulationRequest request, Authentication authentication) {
        return simulationService.createSimulation(
                currentActorService.require(authentication),
                new SimulationModels.CreateSimulationCommand(
                        request.countryCode(),
                        request.actionKey(),
                        request.durationHours(),
                        request.allyCodes() == null ? List.of() : request.allyCodes()
                )
        );
    }

    @GetMapping("/simulations/{id}")
    public SimulationModels.SimulationView getSimulation(@PathVariable UUID id, Authentication authentication) {
        return simulationService.getSimulation(currentActorService.require(authentication), id);
    }

    @GetMapping("/history")
    public List<SimulationModels.HistoryItem> history(Authentication authentication) {
        return simulationService.getHistory(currentActorService.require(authentication));
    }

    public record CreateSimulationRequest(
            @NotBlank String countryCode,
            @NotBlank String actionKey,
            @Min(1) @Max(720) int durationHours,
            List<String> allyCodes
    ) {
    }
}
