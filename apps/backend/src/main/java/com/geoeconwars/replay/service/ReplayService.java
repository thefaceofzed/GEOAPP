package com.geoeconwars.replay.service;

import com.geoeconwars.replay.domain.ReplayLink;
import com.geoeconwars.replay.domain.ReplayLinkRepository;
import com.geoeconwars.shared.exception.NotFoundException;
import com.geoeconwars.simulations.service.SimulationMapper;
import com.geoeconwars.simulations.service.SimulationModels;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReplayService {

    private final ReplayLinkRepository replayLinkRepository;
    private final SimulationMapper simulationMapper;

    public ReplayService(ReplayLinkRepository replayLinkRepository, SimulationMapper simulationMapper) {
        this.replayLinkRepository = replayLinkRepository;
        this.simulationMapper = simulationMapper;
    }

    @Transactional(readOnly = true)
    public SimulationModels.SimulationView getPublicReplay(String publicToken) {
        ReplayLink replayLink = replayLinkRepository.findByPublicTokenAndIsPublicTrue(publicToken)
                .orElseThrow(() -> new NotFoundException("Replay not found"));
        return simulationMapper.toView(replayLink.getSimulation(), replayLink.getPublicToken(), null, false);
    }
}
