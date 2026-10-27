        /* ==========================================================================
           STATE MANAGEMENT & LOCAL STORAGE PERSISTENCE
           ========================================================================== */
        const STORAGE_KEY = 'TOORNAMENT_PRO_DATA_V1';

        let appState = {
            activeTournamentId: null,
            tournaments: [],
            timer: {
                matchId: null,
                totalSeconds: 900,
                remainingSeconds: 900,
                isRunning: false,
                soundEnabled: true
            }
        };

        let timerInterval = null;
        let audioCtx = null;

        // Default Initial Demo Tournament
        const demoTournament = {
            id: 'tourn-demo',
            name: 'Copa eSports Masters 2026',
            game: 'Valorant',
            format: 'elimination', // 'elimination' or 'league'
            defaultTimeMinutes: 15,
            participants: ['Team Secret', 'Fnatic', 'Sentinels', 'Paper Rex', 'DRX', 'Team Liquid', 'Natus Vincere', 'LOUD'],
            matches: []
        };

        function loadState() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                if (data) {
                    appState = JSON.parse(data);
                } else {
                    appState.tournaments = [demoTournament];
                    appState.activeTournamentId = demoTournament.id;
                    saveState();
                }
            } catch (e) {
                console.error("Error loading LocalStorage state", e);
                appState.tournaments = [demoTournament];
                appState.activeTournamentId = demoTournament.id;
            }
        }

        function saveState() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
            } catch (e) {
                console.error("Error saving state to LocalStorage", e);
            }
        }

        function getActiveTournament() {
            return appState.tournaments.find(t => t.id === appState.activeTournamentId) || appState.tournaments[0];
        }

        /* ==========================================================================
           WEB AUDIO API SOUND SYNTHESIZER
           ========================================================================== */
        function initAudioContext() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
        }

        function playBeepSound(frequency = 800, duration = 0.15) {
            try {
                initAudioContext();
                if (!appState.timer.soundEnabled || !audioCtx) return;
                
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
                
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch (e) {
                console.log("Audio play error", e);
            }
        }

        function playBuzzerSound() {
            try {
                initAudioContext();
                if (!audioCtx) return;

                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc1.type = 'sawtooth';
                osc2.type = 'square';
                
                osc1.frequency.setValueAtTime(220, audioCtx.currentTime);
                osc2.frequency.setValueAtTime(440, audioCtx.currentTime);

                gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(audioCtx.destination);

                osc1.start();
                osc2.start();
                osc1.stop(audioCtx.currentTime + 1.2);
                osc2.stop(audioCtx.currentTime + 1.2);
            } catch (e) {
                console.log("Audio buzzer error", e);
            }
        }

        /* ==========================================================================
           TAB NAVIGATION & MODALS
           ========================================================================== */
        function setActiveTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('bg-brand-500/10', 'text-brand-400', 'border-b-2', 'border-brand-500');
                btn.classList.add('text-slate-400', 'hover:text-slate-200');
            });

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });

            const activeBtn = document.getElementById(`tab-${tabName}`);
            const activeContent = document.getElementById(`content-${tabName}`);

            if (activeBtn) {
                activeBtn.classList.add('bg-brand-500/10', 'text-brand-400');
                activeBtn.classList.remove('text-slate-400');
            }
            if (activeContent) {
                activeContent.classList.remove('hidden');
            }

            // Render specific views on tab open
            if (tabName === 'brackets') renderBracketsTab();
            if (tabName === 'standings') renderStandingsTab();
            if (tabName === 'participants') renderParticipantsTab();
            if (tabName === 'tournaments') renderTournamentsTab();
        }

        function openNewTournamentModal() {
            document.getElementById('newTournamentModal').classList.remove('hidden');
        }

        function closeNewTournamentModal() {
            document.getElementById('newTournamentModal').classList.add('hidden');
        }

        /* ==========================================================================
           TOURNAMENT CREATION & SWITCHING
           ========================================================================== */
        function switchTournament(id) {
            appState.activeTournamentId = id;
            saveState();
            renderHeaderSelector();
            const active = getActiveTournament();
            if (active) {
                appState.timer.totalSeconds = active.defaultTimeMinutes * 60;
                appState.timer.remainingSeconds = active.defaultTimeMinutes * 60;
                appState.timer.matchId = null;
                updateTimerDisplay();
            }
            // Re-render current active tab view
            const currentTabBtn = document.querySelector('.tab-btn.bg-brand-500\\/10');
            const currentTab = currentTabBtn ? currentTabBtn.id.replace('tab-', '') : 'tournaments';
            setActiveTab(currentTab);
        }

        function handleCreateTournament(event) {
            event.preventDefault();
            const name = document.getElementById('modalNameInput').value.trim();
            const game = document.getElementById('modalGameInput').value.trim();
            const format = document.getElementById('modalFormatInput').value;
            const defaultTimeMinutes = parseInt(document.getElementById('modalTimeInput').value) || 15;

            const newTourn = {
                id: 'tourn-' + Date.now(),
                name,
                game,
                format,
                defaultTimeMinutes,
                participants: [],
                matches: []
            };

            appState.tournaments.push(newTourn);
            appState.activeTournamentId = newTourn.id;
            saveState();

            closeNewTournamentModal();
            renderHeaderSelector();
            setActiveTab('participants');
            
            // Clear inputs
            document.getElementById('modalNameInput').value = '';
            document.getElementById('modalGameInput').value = '';
        }

        function deleteTournament(id, event) {
            if (event) event.stopPropagation();
            if (appState.tournaments.length <= 1) {
                alert("Debes tener al menos un torneo en el sistema.");
                return;
            }
            appState.tournaments = appState.tournaments.filter(t => t.id !== id);
            if (appState.activeTournamentId === id) {
                appState.activeTournamentId = appState.tournaments[0].id;
            }
            saveState();
            renderHeaderSelector();
            renderTournamentsTab();
        }

        /* ==========================================================================
           PARTICIPANTS MANAGEMENT
           ========================================================================== */
        function handleAddParticipant(e) {
            e.preventDefault();
            const input = document.getElementById('participantNameInput');
            const name = input.value.trim();
            if (!name) return;

            const tourn = getActiveTournament();
            if (tourn) {
                tourn.participants.push(name);
                saveState();
                input.value = '';
                renderParticipantsTab();
            }
        }

        function handleBulkAddParticipants() {
            const textarea = document.getElementById('bulkParticipantsInput');
            const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) return;

            const tourn = getActiveTournament();
            if (tourn) {
                tourn.participants.push(...lines);
                saveState();
                textarea.value = '';
                renderParticipantsTab();
            }
        }

        function removeParticipant(index) {
            const tourn = getActiveTournament();
            if (tourn) {
                tourn.participants.splice(index, 1);
                saveState();
                renderParticipantsTab();
            }
        }

        function clearAllParticipants() {
            const tourn = getActiveTournament();
            if (tourn) {
                tourn.participants = [];
                tourn.matches = [];
                saveState();
                renderParticipantsTab();
            }
        }

        /* ==========================================================================
           BRACKET & FIXTURE GENERATOR ENGINE
           ========================================================================== */
        function generateTournamentStructure() {
            const tourn = getActiveTournament();
            if (!tourn) return;

            if (tourn.participants.length < 2) {
                alert("Registra al menos 2 participantes para generar la estructura del torneo.");
                return;
            }

            if (tourn.format === 'elimination') {
                generateSingleElimination(tourn);
            } else {
                generateRoundRobin(tourn);
            }

            saveState();
            renderBracketsTab();
        }

        function generateSingleElimination(tourn) {
            const rawParticipants = [...tourn.participants];
            // Next power of 2
            let power = 2;
            while (power < rawParticipants.length) {
                power *= 2;
            }

            // Pad with BYEs
            const paddedTeams = [...rawParticipants];
            while (paddedTeams.length < power) {
                paddedTeams.push('BYE');
            }

            const totalRounds = Math.log2(power);
            const matches = [];

            // Generate Round 1
            let matchCounter = 1;
            let currentRoundMatches = [];
            for (let i = 0; i < power; i += 2) {
                const match = {
                    id: `m-1-${matchCounter}`,
                    round: 1,
                    matchNumber: matchCounter,
                    team1: paddedTeams[i],
                    team2: paddedTeams[i + 1],
                    score1: null,
                    score2: null,
                    winner: null,
                    nextMatchId: null,
                    slotInNextMatch: null
                };

                // Auto-advance if BYE
                if (match.team2 === 'BYE') {
                    match.score1 = 1;
                    match.score2 = 0;
                    match.winner = match.team1;
                } else if (match.team1 === 'BYE') {
                    match.score1 = 0;
                    match.score2 = 1;
                    match.winner = match.team2;
                }

                currentRoundMatches.push(match);
                matches.push(match);
                matchCounter++;
            }

            // Generate Subsequent Rounds
            for (let r = 2; r <= totalRounds; r++) {
                const nextRoundMatches = [];
                const matchesInRound = power / Math.pow(2, r);
                for (let m = 1; m <= matchesInRound; m++) {
                    const match = {
                        id: `m-${r}-${m}`,
                        round: r,
                        matchNumber: m,
                        team1: 'TBD',
                        team2: 'TBD',
                        score1: null,
                        score2: null,
                        winner: null,
                        nextMatchId: null,
                        slotInNextMatch: null
                    };
                    nextRoundMatches.push(match);
                    matches.push(match);
                }

                // Link previous round matches to this round
                for (let i = 0; i < currentRoundMatches.length; i++) {
                    const prevMatch = currentRoundMatches[i];
                    const nextMatchIndex = Math.floor(i / 2);
                    const targetMatch = nextRoundMatches[nextMatchIndex];
                    prevMatch.nextMatchId = targetMatch.id;
                    prevMatch.slotInNextMatch = (i % 2 === 0) ? 1 : 2;

                    // Carry over automatic BYE winners
                    if (prevMatch.winner) {
                        if (prevMatch.slotInNextMatch === 1) targetMatch.team1 = prevMatch.winner;
                        else targetMatch.team2 = prevMatch.winner;
                    }
                }
                currentRoundMatches = nextRoundMatches;
            }

            tourn.matches = matches;
        }

        function generateRoundRobin(tourn) {
            const teams = [...tourn.participants];
            if (teams.length % 2 !== 0) {
                teams.push('BYE');
            }

            const n = teams.length;
            const rounds = n - 1;
            const matchesPerRound = n / 2;
            const matches = [];

            let matchCounter = 1;
            for (let r = 0; r < rounds; r++) {
                for (let m = 0; m < matchesPerRound; m++) {
                    const home = teams[m];
                    const away = teams[n - 1 - m];

                    if (home !== 'BYE' && away !== 'BYE') {
                        matches.push({
                            id: `m-rr-${matchCounter}`,
                            round: r + 1,
                            matchNumber: matchCounter,
                            team1: home,
                            team2: away,
                            score1: null,
                            score2: null,
                            winner: null
                        });
                        matchCounter++;
                    }
                }
                // Rotate array keeping index 0 fixed
                teams.splice(1, 0, teams.pop());
            }

            tourn.matches = matches;
        }

        function updateMatchScore(matchId, score1Val, score2Val) {
            const tourn = getActiveTournament();
            if (!tourn) return;

            const match = tourn.matches.find(m => m.id === matchId);
            if (!match) return;

            const s1 = score1Val === '' ? null : parseInt(score1Val);
            const s2 = score2Val === '' ? null : parseInt(score2Val);

            match.score1 = s1;
            match.score2 = s2;

            if (s1 !== null && s2 !== null) {
                if (s1 > s2) match.winner = match.team1;
                else if (s2 > s1) match.winner = match.team2;
                else match.winner = 'DRAW';

                // Advance winner in Single Elimination
                if (tourn.format === 'elimination' && match.nextMatchId && match.winner && match.winner !== 'DRAW') {
                    advanceWinner(tourn, match);
                }
            } else {
                match.winner = null;
            }

            saveState();
            renderBracketsTab();
        }

        function advanceWinner(tourn, completedMatch) {
            const nextMatch = tourn.matches.find(m => m.id === completedMatch.nextMatchId);
            if (!nextMatch) return;

            if (completedMatch.slotInNextMatch === 1) {
                nextMatch.team1 = completedMatch.winner;
            } else if (completedMatch.slotInNextMatch === 2) {
                nextMatch.team2 = completedMatch.winner;
            }

            // Recalculate if next match had BYE
            if (nextMatch.team1 === 'BYE') nextMatch.winner = nextMatch.team2;
            if (nextMatch.team2 === 'BYE') nextMatch.winner = nextMatch.team1;
        }

        function sendMatchToTimer(matchId) {
            const tourn = getActiveTournament();
            if (!tourn) return;
            const match = tourn.matches.find(m => m.id === matchId);
            if (!match) return;

            appState.timer.matchId = matchId;
            appState.timer.totalSeconds = tourn.defaultTimeMinutes * 60;
            appState.timer.remainingSeconds = tourn.defaultTimeMinutes * 60;
            saveState();

            setActiveTab('timer');
            updateTimerDisplay();
        }

        /* ==========================================================================
           CLASSIFICATION & STANDINGS TABLE LOGIC
           ========================================================================== */
        function calculateStandings(tourn) {
            if (!tourn) return [];

            const stats = {};
            tourn.participants.forEach(p => {
                if (p !== 'BYE') {
                    stats[p] = { name: p, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0 };
                }
            });

            tourn.matches.forEach(m => {
                if (m.score1 !== null && m.score2 !== null) {
                    const t1 = stats[m.team1];
                    const t2 = stats[m.team2];

                    if (t1) {
                        t1.pj += 1;
                        t1.gf += m.score1;
                        t1.gc += m.score2;
                        if (m.score1 > m.score2) { t1.pts += 3; t1.pg += 1; }
                        else if (m.score1 === m.score2) { t1.pts += 1; t1.pe += 1; }
                        else { t1.pp += 1; }
                    }

                    if (t2) {
                        t2.pj += 1;
                        t2.gf += m.score2;
                        t2.gc += m.score1;
                        if (m.score2 > m.score1) { t2.pts += 3; t2.pg += 1; }
                        else if (m.score1 === m.score2) { t2.pts += 1; t2.pe += 1; }
                        else { t2.pp += 1; }
                    }
                }
            });

            // Calculate Difference
            Object.values(stats).forEach(s => s.dif = s.gf - s.gc);

            // Sort by Points -> DIF -> GF
            return Object.values(stats).sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.dif !== a.dif) return b.dif - a.dif;
                return b.gf - a.gf;
            });
        }

        /* ==========================================================================
           TIMER CONTROLLER ENGINE
           ========================================================================== */
        function startTimer() {
            initAudioContext();
            if (appState.timer.isRunning) return;

            appState.timer.isRunning = true;
            document.getElementById('btnTimerStart').classList.add('hidden');
            document.getElementById('btnTimerPause').classList.remove('hidden');
            document.getElementById('timer-status-dot').className = 'w-2 h-2 rounded-full bg-accent-mint inline-block ml-1 animate-pulse';

            timerInterval = setInterval(() => {
                if (appState.timer.remainingSeconds > 0) {
                    appState.timer.remainingSeconds--;
                    
                    // Beep sound on last 5 seconds
                    if (appState.timer.remainingSeconds <= 5 && appState.timer.remainingSeconds > 0) {
                        playBeepSound(900, 0.1);
                    }
                    
                    updateTimerDisplay();
                } else {
                    pauseTimer();
                    playBuzzerSound();
                    
                    // Flashing Visual Alert
                    const card = document.getElementById('mainTimerCard');
                    card.classList.add('timer-warning');
                    setTimeout(() => card.classList.remove('timer-warning'), 5000);
                }
            }, 1000);
        }

        function pauseTimer() {
            appState.timer.isRunning = false;
            clearInterval(timerInterval);
            document.getElementById('btnTimerStart').classList.remove('hidden');
            document.getElementById('btnTimerPause').classList.add('hidden');
            document.getElementById('timer-status-dot').className = 'w-2 h-2 rounded-full bg-slate-600 inline-block ml-1';
        }

        function resetTimer() {
            pauseTimer();
            appState.timer.remainingSeconds = appState.timer.totalSeconds;
            updateTimerDisplay();
        }

        function adjustTimer(seconds) {
            appState.timer.remainingSeconds = Math.max(0, appState.timer.remainingSeconds + seconds);
            updateTimerDisplay();
        }

        function setTimerDuration(seconds) {
            pauseTimer();
            appState.timer.totalSeconds = seconds;
            appState.timer.remainingSeconds = seconds;
            updateTimerDisplay();
        }

        function updateTimerDisplay() {
            const mins = Math.floor(appState.timer.remainingSeconds / 60);
            const secs = appState.timer.remainingSeconds % 60;
            const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            document.getElementById('timerDisplay').innerText = timeStr;

            // Progress Bar
            const pct = appState.timer.totalSeconds > 0 
                ? (appState.timer.remainingSeconds / appState.timer.totalSeconds) * 100 
                : 0;
            document.getElementById('timerProgressBar').style.width = `${pct}%`;

            // Active Match Info
            const tourn = getActiveTournament();
            const activeMatchText = document.getElementById('activeMatchText');
            if (tourn && appState.timer.matchId) {
                const match = tourn.matches.find(m => m.id === appState.timer.matchId);
                if (match) {
                    activeMatchText.innerText = `Partida Activa: ${match.team1} vs ${match.team2}`;
                } else {
                    activeMatchText.innerText = `Tiempo General: ${tourn.name}`;
                }
            } else if (tourn) {
                activeMatchText.innerText = `Tiempo General: ${tourn.name}`;
            } else {
                activeMatchText.innerText = `Modo Libre - Cronómetro`;
            }
        }

        /* ==========================================================================
           UI RENDERING ENGINES
           ========================================================================== */
        function renderHeaderSelector() {
            const select = document.getElementById('tournamentSelect');
            select.innerHTML = '';
            appState.tournaments.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.name} (${t.game})`;
                if (t.id === appState.activeTournamentId) opt.selected = true;
                select.appendChild(opt);
            });
        }

        function renderTournamentsTab() {
            const grid = document.getElementById('tournamentsGrid');
            grid.innerHTML = '';

            appState.tournaments.forEach(t => {
                const isActive = t.id === appState.activeTournamentId;
                const card = document.createElement('div');
                card.className = `p-5 rounded-2xl border transition-all cursor-pointer relative ${
                    isActive 
                    ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950/40 border-brand-500 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500/50' 
                    : 'bg-darkCard border-darkBorder hover:border-slate-700'
                }`;

                card.onclick = () => switchTournament(t.id);

                const formatBadge = t.format === 'elimination' ? 'Eliminación Directa' : 'Liga / Round Robin';

                card.innerHTML = `
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded ${isActive ? 'bg-brand-500 text-slate-950' : 'bg-slate-800 text-slate-400'}">
                            ${t.game}
                        </span>
                        <button onclick="deleteTournament('${t.id}', event)" class="text-slate-500 hover:text-rose-400 transition p-1" title="Eliminar Torneo">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-1 line-clamp-1">${t.name}</h3>
                    <p class="text-xs text-slate-400 mb-4 flex items-center gap-2">
                        <span><i class="fa-solid fa-sitemap text-brand-400"></i> ${formatBadge}</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-clock text-brand-400"></i> ${t.defaultTimeMinutes} min</span>
                    </p>
                    <div class="flex items-center justify-between text-xs pt-3 border-t border-slate-800 text-slate-400">
                        <span>${t.participants.length} Participantes</span>
                        <span class="text-brand-400 font-semibold">${isActive ? 'Seleccionado' : 'Seleccionar'} &rarr;</span>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        function renderParticipantsTab() {
            const tourn = getActiveTournament();
            const listContainer = document.getElementById('participantsList');
            const badgeCount = document.getElementById('badge-participants-count');

            if (!tourn) return;

            badgeCount.innerText = tourn.participants.length;
            listContainer.innerHTML = '';

            if (tourn.participants.length === 0) {
                listContainer.innerHTML = `
                    <div class="col-span-full py-12 text-center text-slate-500 text-xs">
                        <i class="fa-solid fa-users-slash text-2xl mb-2 block text-slate-600"></i>
                        No hay participantes registrados en este torneo aún.
                    </div>
                `;
                return;
            }

            tourn.participants.forEach((p, idx) => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-slate-700 transition';
                item.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <span class="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-mono text-xs flex items-center justify-center font-bold">${idx + 1}</span>
                        <span class="text-slate-100">${p}</span>
                    </div>
                    <button onclick="removeParticipant(${idx})" class="text-slate-500 hover:text-rose-400 p-1 transition">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;
                listContainer.appendChild(item);
            });
        }

        function renderBracketsTab() {
            const tourn = getActiveTournament();
            const container = document.getElementById('bracketViewContainer');
            container.innerHTML = '';

            if (!tourn || tourn.participants.length < 2) {
                container.innerHTML = `
                    <div class="py-16 text-center text-slate-500 text-sm">
                        <i class="fa-solid fa-sitemap text-3xl mb-3 block text-slate-600"></i>
                        Por favor agrega al menos 2 participantes y presiona "Generar Cuadro".
                    </div>
                `;
                return;
            }

            if (!tourn.matches || tourn.matches.length === 0) {
                container.innerHTML = `
                    <div class="py-16 text-center text-slate-500 text-sm">
                        <i class="fa-solid fa-wand-magic-sparkles text-3xl mb-3 block text-brand-400"></i>
                        Estructura no generada aún. Haz clic en <b>"Generar / Reiniciar Cuadro"</b> para iniciar los enfrentamientos.
                    </div>
                `;
                return;
            }

            if (tourn.format === 'elimination') {
                renderEliminationBracket(tourn, container);
            } else {
                renderRoundRobinFixtures(tourn, container);
            }
        }

        function renderEliminationBracket(tourn, container) {
            const maxRound = Math.max(...tourn.matches.map(m => m.round));
            
            const bracketWrapper = document.createElement('div');
            bracketWrapper.className = 'flex items-center gap-8 min-w-max py-4';

            for (let r = 1; r <= maxRound; r++) {
                const roundMatches = tourn.matches.filter(m => m.round === r);
                const roundCol = document.createElement('div');
                roundCol.className = 'flex flex-col justify-around h-full space-y-6 min-w-[240px]';

                let roundTitle = `Ronda ${r}`;
                if (r === maxRound) roundTitle = '🏆 GRAN FINAL';
                else if (r === maxRound - 1) roundTitle = 'Semifinales';
                else if (r === maxRound - 2) roundTitle = 'Cuartos de Final';

                const titleHeader = document.createElement('h4');
                titleHeader.className = 'text-xs font-bold uppercase tracking-wider text-brand-400 mb-2 border-b border-slate-800 pb-2 text-center';
                titleHeader.innerText = roundTitle;
                roundCol.appendChild(titleHeader);

                roundMatches.forEach(m => {
                    const matchCard = document.createElement('div');
                    matchCard.className = 'bracket-match bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-lg space-y-2';

                    const isTeam1Winner = m.winner && m.winner === m.team1;
                    const isTeam2Winner = m.winner && m.winner === m.team2;

                    matchCard.innerHTML = `
                        <!-- Team 1 Row -->
                        <div class="flex items-center justify-between p-1.5 rounded-lg ${isTeam1Winner ? 'bg-brand-500/20 border border-brand-500/50' : 'bg-slate-900'}">
                            <span class="text-xs font-semibold ${isTeam1Winner ? 'text-brand-300 font-bold' : 'text-slate-200'} truncate max-w-[130px]">${m.team1}</span>
                            <input type="number" min="0" value="${m.score1 !== null ? m.score1 : ''}" 
                                onchange="updateMatchScore('${m.id}', this.value, ${m.score2 !== null ? m.score2 : "''"})"
                                class="w-10 bg-slate-950 border border-slate-700 text-center text-xs font-mono rounded p-1 text-white focus:outline-none focus:border-brand-500" ${m.team1 === 'BYE' || m.team1 === 'TBD' ? 'disabled' : ''}>
                        </div>

                        <!-- Team 2 Row -->
                        <div class="flex items-center justify-between p-1.5 rounded-lg ${isTeam2Winner ? 'bg-brand-500/20 border border-brand-500/50' : 'bg-slate-900'}">
                            <span class="text-xs font-semibold ${isTeam2Winner ? 'text-brand-300 font-bold' : 'text-slate-200'} truncate max-w-[130px]">${m.team2}</span>
                            <input type="number" min="0" value="${m.score2 !== null ? m.score2 : ''}" 
                                onchange="updateMatchScore('${m.id}', ${m.score1 !== null ? m.score1 : "''"}, this.value)"
                                class="w-10 bg-slate-950 border border-slate-700 text-center text-xs font-mono rounded p-1 text-white focus:outline-none focus:border-brand-500" ${m.team2 === 'BYE' || m.team2 === 'TBD' ? 'disabled' : ''}>
                        </div>

                        <!-- Match Card Footer Action -->
                        <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-500">
                            <span>M#${m.matchNumber}</span>
                            <button onclick="sendMatchToTimer('${m.id}')" class="text-brand-400 hover:text-brand-300 transition flex items-center gap-1">
                                <i class="fa-solid fa-stopwatch"></i> Reloj
                            </button>
                        </div>
                    `;
                    roundCol.appendChild(matchCard);
                });

                bracketWrapper.appendChild(roundCol);
            }

            container.appendChild(bracketWrapper);
        }

        function renderRoundRobinFixtures(tourn, container) {
            const maxRound = Math.max(...tourn.matches.map(m => m.round));
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

            for (let r = 1; r <= maxRound; r++) {
                const roundMatches = tourn.matches.filter(m => m.round === r);

                const roundCard = document.createElement('div');
                roundCard.className = 'bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3';
                roundCard.innerHTML = `<h4 class="text-xs font-bold text-brand-400 uppercase tracking-wider border-b border-slate-800 pb-2">Jornada ${r}</h4>`;

                roundMatches.forEach(m => {
                    const matchItem = document.createElement('div');
                    matchItem.className = 'bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-2';

                    matchItem.innerHTML = `
                        <div class="flex items-center justify-between text-xs">
                            <span class="font-medium text-slate-200 truncate w-1/3">${m.team1}</span>
                            <div class="flex items-center gap-1">
                                <input type="number" min="0" value="${m.score1 !== null ? m.score1 : ''}" 
                                    onchange="updateMatchScore('${m.id}', this.value, ${m.score2 !== null ? m.score2 : "''"})" 
                                    class="w-10 bg-slate-950 border border-slate-700 text-center font-mono rounded py-1 text-white focus:outline-none focus:border-brand-500">
                                <span class="text-slate-500 font-bold">-</span>
                                <input type="number" min="0" value="${m.score2 !== null ? m.score2 : ''}" 
                                    onchange="updateMatchScore('${m.id}', ${m.score1 !== null ? m.score1 : "''"}, this.value)" 
                                    class="w-10 bg-slate-950 border border-slate-700 text-center font-mono rounded py-1 text-white focus:outline-none focus:border-brand-500">
                            </div>
                            <span class="font-medium text-slate-200 truncate w-1/3 text-right">${m.team2}</span>
                        </div>
                        <div class="flex justify-end pt-1">
                            <button onclick="sendMatchToTimer('${m.id}')" class="text-[10px] text-brand-400 hover:text-brand-300 transition flex items-center gap-1">
                                <i class="fa-solid fa-stopwatch"></i> Cargar al Timer
                            </button>
                        </div>
                    `;
                    roundCard.appendChild(matchItem);
                });

                grid.appendChild(roundCard);
            }

            container.appendChild(grid);
        }

        function renderStandingsTab() {
            const tourn = getActiveTournament();
            const tbody = document.getElementById('standingsTableBody');
            tbody.innerHTML = '';

            if (!tourn) return;

            const standings = calculateStandings(tourn);

            if (standings.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="p-8 text-center text-slate-500 text-xs">
                            No hay datos para mostrar la clasificación. Asegúrate de haber agregado participantes.
                        </td>
                    </tr>
                `;
                return;
            }

            standings.forEach((st, idx) => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-900/50 transition';

                let posBadge = `<span class="font-mono text-slate-400 font-semibold">${idx + 1}</span>`;
                if (idx === 0) posBadge = `<span class="w-6 h-6 rounded-full bg-accent-gold/20 text-accent-gold border border-accent-gold/40 flex items-center justify-center font-bold text-xs">1</span>`;
                else if (idx === 1) posBadge = `<span class="w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 flex items-center justify-center font-bold text-xs">2</span>`;
                else if (idx === 2) posBadge = `<span class="w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center justify-center font-bold text-xs">3</span>`;

                tr.innerHTML = `
                    <td class="p-3">${posBadge}</td>
                    <td class="p-3 font-semibold text-slate-100">${st.name}</td>
                    <td class="p-3 text-center font-mono font-bold text-brand-400">${st.pts}</td>
                    <td class="p-3 text-center font-mono">${st.pj}</td>
                    <td class="p-3 text-center font-mono text-emerald-400">${st.pg}</td>
                    <td class="p-3 text-center font-mono text-slate-400">${st.pe}</td>
                    <td class="p-3 text-center font-mono text-rose-400">${st.pp}</td>
                    <td class="p-3 text-center font-mono">${st.gf}</td>
                    <td class="p-3 text-center font-mono">${st.gc}</td>
                    <td class="p-3 text-center font-mono font-semibold ${st.dif > 0 ? 'text-emerald-400' : st.dif < 0 ? 'text-rose-400' : 'text-slate-400'}">
                        ${st.dif > 0 ? '+' + st.dif : st.dif}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        /* ==========================================================================
           EXPORT & GLOBAL RESET PROCEDURES
           ========================================================================== */
        function exportData() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `toornament_backup_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }

        function resetAllData() {
            if (confirm("¿Estás seguro de resetear todo el sistema? Se borrarán todos los torneos registrados.")) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        }

        /* ==========================================================================
           PROJECTION: TIMER SCREEN (TV / PROJECTION MODE)
           ========================================================================== */
        function openProjectedTimer() {
            window.open('timer.html', '_blank');
        }

        /* ==========================================================================
           INITIALIZATION ON LOAD
           ========================================================================== */
        window.addEventListener('DOMContentLoaded', () => {
            loadState();

            // Sound Checkbox Bind
            const soundToggle = document.getElementById('soundToggle');
            if (soundToggle) {
                soundToggle.checked = appState.timer.soundEnabled;
                soundToggle.addEventListener('change', (e) => {
                    appState.timer.soundEnabled = e.target.checked;
                    saveState();
                });
            }

            // Full panel app (index.html)
            if (document.getElementById('tournamentSelect')) {
                renderHeaderSelector();

                // Default to Tournaments Tab
                setActiveTab('tournaments');
            }

            updateTimerDisplay();
        });
