package com.geoeconwars.replay.api;

import com.geoeconwars.replay.service.ReplayService;
import com.geoeconwars.simulations.service.SimulationModels;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/replays")
public class ReplayController {

    private final ReplayService replayService;

    public ReplayController(ReplayService replayService) {
        this.replayService = replayService;
    }

    @GetMapping("/{token}")
    public SimulationModels.SimulationView getReplay(@PathVariable String token) {
        return replayService.getPublicReplay(token);
    }
}
