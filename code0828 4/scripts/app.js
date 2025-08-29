
// === Legend hard-hide helper ===
function hideLegend(){ try{ document.getElementById('legend-section')?.classList.add('hidden'); }catch(e){} }
function showLegend(){ try{ document.getElementById('legend-section')?.classList.remove('hidden'); }catch(e){} }


        // --- DOM Elements ---
        const usernameInput = document.getElementById('usernameInput');
        const fetchRostersButton = document.getElementById('fetchRostersButton');
        const fetchOwnershipButton = document.getElementById('fetchOwnershipButton');
        const leagueSelect = document.getElementById('leagueSelect');
        const contextualControls = document.getElementById('contextual-controls');
        const rosterControls = document.getElementById('rosterControls');
        const loadingIndicator = document.getElementById('loading');
        const welcomeScreen = document.getElementById('welcome-screen');
        const rosterView = document.getElementById('rosterView');
        const playerListView = document.getElementById('playerListView');
        const rosterContainer = document.getElementById('rosterContainer');
        const rosterGrid = document.getElementById('rosterGrid');
        const compareButton = document.getElementById('compareButton');
        const clearCompareButton = document.getElementById('clearCompareButton');
        const positionalViewBtn = document.getElementById('positionalViewBtn');
        const depthChartViewBtn = document.getElementById('depthChartViewBtn');
        const viewControls = document.getElementById('view-controls');
        const positionalFiltersContainer = document.getElementById('positional-filters');
        const tradeSimulator = document.getElementById('tradeSimulator');
        const mainContent = document.getElementById('content');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const menuToggle = document.getElementById('menuToggle');
        const pageType = document.body.dataset.page || 'welcome';

        // --- State ---
        let state = { userId: null, leagues: [], players: {}, oneQbData: {}, sflxData: {}, currentLeagueId: null, isSuperflex: false, cache: {}, teamsToCompare: new Set(), isCompareMode: false, currentRosterView: 'positional', activePositions: new Set(), tradeBlock: {} };
        const assignedLeagueColors = new Map();
        let nextColorIndex = 0;
        const assignedRyColors = new Map();
        let nextRyColorIndex = 0;

        // --- Constants ---
        const API_BASE = 'https://api.sleeper.app/v1';
        const GOOGLE_SHEET_ID = '1MDTf1IouUIrm4qabQT9E5T0FsJhQtmaX55P32XK5c_0';
        const TAG_COLORS = { QB:"var(--pos-qb)", RB:"var(--pos-rb)", WR:"var(--pos-wr)", TE:"var(--pos-te)", BN:"var(--pos-bn)", TX:"var(--pos-tx)", FLX: "var(--pos-flx)", SFLX: "var(--pos-sflx)" };
        const STARTER_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'];
        const TEAM_COLORS = { ARI:"#97233F", ATL:"#A71930", BAL:"#241773", BUF:"#00338D", CAR:"#0085CA", CHI:"#1a2d4e", CIN:"#FB4F14", CLE:"#311D00", DAL:"#003594", DEN:"#FB4F14", DET:"#0076B6", GB:"#203731", HOU:"#03202F", IND:"#002C5F", JAX:"#006778", KC:"#E31837", LAC:"#0080C6", LAR:"#003594", LV:"#A5ACAF", MIA:"#008E97", MIN:"#4F2683", NE:"#002244", NO:"#D3BC8D", NYG:"#0B2265", NYJ:"#125740", PHI:"#004C54", PIT:"#FFB612", SEA:"#69BE28", SF:"#B3995D", TB:"#D50A0A", TEN:"#4B92DB", WAS:"#5A1414", FA: "#64748b" };
        const LEAGUE_COLOR_PALETTE = ['#e8d28a', '#bfeee5', '#d9d0ff', '#cfe9ff', '#ffd6e7', '#d9ffcf', '#ffc7a8', '#a8d8ff', '#f2c8ff', '#c8ffde'];
        const RY_COLOR_PALETTE = ['#d7f2ff', '#cfe9ff', '#e0f6ea', '#fff1d6', '#efe2ff', '#ffe0ea', '#e4f0ff'];
              const LEAGUE_ABBR_OVERRIDES = {
            "ff d-league": "DL",
            "the most important league": "TMIL",
            "big boofers club bbc": "BBC",
            "trade hoard eat league": "THE",
            "dynasty footballers": "DFB", "la leaguaaa dynasty est2024": "LLGA",
            "la leaugaaa dynasty est2024": "LLGA"
        };

        // --- Event Listeners ---
        if (pageType === 'welcome') {
            fetchRostersButton?.addEventListener('click', () => {
                const username = usernameInput.value.trim();
                if (!username) return;
                window.location.href = `rosters/rosters.html?username=${encodeURIComponent(username)}`;
            });
            fetchOwnershipButton?.addEventListener('click', () => {
                const username = usernameInput.value.trim();
                if (!username) return;
                window.location.href = `ownership/ownership.html?username=${encodeURIComponent(username)}`;
            });
        } else if (pageType === 'rosters') {
            fetchRostersButton?.addEventListener('click', handleFetchRosters);
            fetchOwnershipButton?.addEventListener('click', () => {
                const username = usernameInput.value.trim();
                if (!username) return;
                window.location.href = `../ownership/ownership.html?username=${encodeURIComponent(username)}`;
            });
        } else if (pageType === 'ownership') {
            fetchOwnershipButton?.addEventListener('click', handleFetchOwnership);
            fetchRostersButton?.addEventListener('click', () => {
                const username = usernameInput.value.trim();
                if (!username) return;
                window.location.href = `../rosters/rosters.html?username=${encodeURIComponent(username)}`;
            });
        }

           leagueSelect?.addEventListener('change', (e) => {
          handleLeagueSelect(e);
          if (e && e.target && e.target.blur) e.target.blur();
        });
        rosterGrid?.addEventListener('click', handleTeamSelect);
        mainContent?.addEventListener('click', handleAssetClickForTrade);
        compareButton?.addEventListener('click', handleCompareClick);
        clearCompareButton?.addEventListener('click', () => handleClearCompare(true));
        positionalViewBtn?.addEventListener('click', () => setRosterView('positional'));
        depthChartViewBtn?.addEventListener('click', () => setRosterView('depth'));
        positionalFiltersContainer?.addEventListener('click', handlePositionFilter);

        menuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu?.classList.toggle('hidden');
        });
        dropdownMenu?.addEventListener('click', (e) => e.stopPropagation());
        document.addEventListener('click', () => dropdownMenu?.classList.add('hidden'));
        
        // --- Initialization ---
        document.addEventListener('DOMContentLoaded', async () => {
            setLoading(true, 'Loading initial data...');
            await Promise.all([ fetchSleeperPlayers(), fetchDataFromGoogleSheet() ]);
            setLoading(false);
            if (welcomeScreen) welcomeScreen.classList.remove('hidden');

            const params = new URLSearchParams(window.location.search);
            const uname = params.get('username');
            if (uname) {
                usernameInput.value = uname;
                if (pageType === 'rosters') {
                    await handleFetchRosters();
                } else if (pageType === 'ownership') {
                    await handleFetchOwnership();
                }
            }
        });

        // --- View Toggling and Main Handlers ---
        function setRosterView(view) {
    hideLegend();
            state.currentRosterView = view;
            const isPositional = view === 'positional';
            positionalViewBtn.classList.toggle('active', isPositional);
            depthChartViewBtn.classList.toggle('active', !isPositional);

            positionalViewBtn.classList.toggle('counterpart-active', !isPositional);
            depthChartViewBtn.classList.toggle('counterpart-active', isPositional);

            if (state.currentTeams) {
                renderAllTeamData(state.currentTeams);
            }
        }

        function updateButtonStates(activeButton) {
            const isRosters = activeButton === 'rosters';
            fetchRostersButton.classList.toggle('active', isRosters);
            fetchOwnershipButton.classList.toggle('active', !isRosters);

            fetchRostersButton.classList.toggle('counterpart-active', !isRosters);
            fetchOwnershipButton.classList.toggle('counterpart-active', isRosters);
        }

        async function handleFetchRosters() {
    hideLegend();
            const username = usernameInput.value.trim();
            if (!username) return;
            
            setLoading(true, 'Fetching user leagues...');
            
            try {
                await fetchAndSetUser(username);
                const leagues = await fetchUserLeagues(state.userId);
                state.leagues = leagues.sort((a, b) => a.name.localeCompare(b.name));
                
                updateButtonStates('rosters');
                contextualControls.classList.remove('hidden');
                playerListView.classList.add('hidden');
                rosterView.classList.remove('hidden');
                setRosterView('positional'); // Set default view
                
                populateLeagueSelect(state.leagues);

                if (state.leagues.length > 0) {
                    leagueSelect.selectedIndex = 1;
                    await handleLeagueSelect();
                } else {
                    contextualControls.classList.add('hidden');
                }
            } catch (error) {
                handleError(error, username);
            } finally {
                setLoading(false);
            }
        }

        async function handleFetchOwnership() {
            const username = usernameInput.value.trim();
            if (!username) return;
            
            setLoading(true, 'Fetching ownership data...');

            try {
                await fetchAndSetUser(username);
                
                updateButtonStates('ownership');
                contextualControls.classList.add('hidden');
                rosterView.classList.add('hidden');
                playerListView.classList.remove('hidden');

                await renderPlayerList();
            } catch (error) {
                handleError(error, username);
            } finally {
                setLoading(false);
            }
        }

        async function handleLeagueSelect() {
    hideLegend();
            const leagueId = leagueSelect.value;
            if (!leagueId || leagueId === 'Select a league...') {
                rosterView.classList.add('hidden');
                return;
            };
            
            state.currentLeagueId = leagueId;
            handleClearCompare(); 
            const leagueInfo = state.leagues.find(l => l.league_id === leagueId);
            const leagueName = leagueInfo?.name || 'league';
            setLoading(true, `Loading ${leagueName}...`);
            rosterGrid.innerHTML = '';

            try {
                const rosterPositions = leagueInfo.roster_positions;
                const superflexSlots = rosterPositions.filter(p => p === 'SUPER_FLEX').length;
                const qbSlots = rosterPositions.filter(p => p === 'QB').length;
                state.isSuperflex = (superflexSlots > 0) || (qbSlots > 1);
                
                const [rosters, users, tradedPicks] = await Promise.all([
                    fetchWithCache(`${API_BASE}/league/${leagueId}/rosters`),
                    fetchWithCache(`${API_BASE}/league/${leagueId}/users`),
                    fetchWithCache(`${API_BASE}/league/${leagueId}/traded_picks`),
                ]);
                
                const teams = processRosterData(rosters, users, tradedPicks, leagueInfo);
                
                const userTeam = teams.find(team => team.isUserTeam);
                if (userTeam) {
                    state.userTeamName = userTeam.teamName;
                    state.teamsToCompare.add(userTeam.teamName);
                } else {
                    state.userTeamName = null;
                }
                updateCompareButtonState();

                renderAllTeamData(teams);
                
                rosterView.classList.remove('hidden');

            } catch (error) {
                console.error(`Error loading league ${leagueId}:`, error);
            } finally {
                setLoading(false);
            }
        }
        
        // --- Compare & Trade Logic ---
        function handleTeamSelect(e) {
            const header = e.target.closest('.team-header-item');
            if (header) {
                const checkbox = header.querySelector('.team-compare-checkbox');
                const teamName = checkbox.dataset.teamName;
                checkbox.classList.toggle('selected');
                if (state.teamsToCompare.has(teamName)) {
                    state.teamsToCompare.delete(teamName);
                } else {
                    state.teamsToCompare.add(teamName);
                }
                updateCompareButtonState();
            }
        }

        function handleCompareClick() {
            state.isCompareMode = !state.isCompareMode;
            rosterView.classList.toggle('is-trade-mode', state.isCompareMode);
            rosterGrid.classList.toggle('is-preview-mode', state.isCompareMode);
            updateCompareButtonState();
            renderAllTeamData(state.currentTeams); 
            renderTradeBlock();
        }

        function handleClearCompare(keepUserTeam = false) {
            const userTeamName = state.currentTeams?.find(team => team.isUserTeam)?.teamName;
            
            const teamsToKeep = new Set();
            if (keepUserTeam && userTeamName && state.teamsToCompare.has(userTeamName)) {
                teamsToKeep.add(userTeamName);
            }
            state.teamsToCompare = teamsToKeep;

            state.isCompareMode = false;
            rosterView.classList.remove('is-trade-mode');
            rosterGrid.classList.remove('is-preview-mode');
            
            updateCompareButtonState();
            clearTrade();
            if (state.currentTeams) {
                renderAllTeamData(state.currentTeams);
            }
        }

        function updateCompareButtonState() {
            const count = state.teamsToCompare.size;
            compareButton.disabled = count < 2;
            clearCompareButton.classList.toggle('hidden', count === 0);

            if (count > 1) {
                compareButton.classList.add('glow-on-select');
            } else {
                compareButton.classList.remove('glow-on-select');
            }

            if (state.isCompareMode) {
                compareButton.textContent = 'Show All';
                compareButton.classList.add('active');
                compareButton.classList.remove('glow-on-select');
            } else {
                compareButton.textContent = 'Preview';
                compareButton.classList.remove('active');
            }
            
            if (count < 2 && state.isCompareMode) {
                handleCompareClick(); // Automatically exit compare mode
            }
        }

        function handleAssetClickForTrade(e) {
            if (!state.isCompareMode) return;

            const assetRow = e.target.closest('.player-row, .pick-row');
            if (!assetRow) return;

            const teamName = assetRow.closest('.roster-column')?.dataset.teamName;
            if (!teamName || !state.teamsToCompare.has(teamName)) return;

            const { assetId, assetLabel, assetKtc } = assetRow.dataset;
            if (!assetId) return;

            if (!state.tradeBlock[teamName]) {
                state.tradeBlock[teamName] = [];
            }

            const assetIndex = state.tradeBlock[teamName].findIndex(a => a.id === assetId);

            if (assetIndex > -1) {
                state.tradeBlock[teamName].splice(assetIndex, 1);
                assetRow.classList.remove('player-selected');
            } else {
                state.tradeBlock[teamName].push({
                    id: assetId,
                    label: assetLabel,
                    ktc: parseInt(assetKtc, 10) || 0
                });
                assetRow.classList.add('player-selected');
            }
            
            renderTradeBlock();
        }

        function clearTrade() {
            state.tradeBlock = {};
            document.querySelectorAll('.player-selected').forEach(el => el.classList.remove('player-selected'));
            renderTradeBlock();
        }


        // --- Position Filter Logic ---
        function handlePositionFilter(e) {
            if (e.target.tagName !== 'BUTTON') return;
            const btn = e.target;
            const position = btn.dataset.position;
            const flexPositions = ['RB', 'WR', 'TE'];

            if (position === 'FLX') {
                const isActivating = !state.activePositions.has('FLX');
                state.activePositions.clear();
                if (isActivating) {
                    flexPositions.forEach(p => state.activePositions.add(p));
                    state.activePositions.add('FLX');
                }
            } else {
                state.activePositions.delete('FLX');
                if (state.activePositions.has(position)) {
                    state.activePositions.delete(position);
                } else {
                    state.activePositions.add(position);
                }
            }
            
            updatePositionFilterButtons();
            renderAllTeamData(state.currentTeams);
        }
        
        function updatePositionFilterButtons() {
            const buttons = positionalFiltersContainer.querySelectorAll('.filter-btn');
            buttons.forEach(btn => {
                const pos = btn.dataset.position;
                btn.classList.toggle('active', state.activePositions.has(pos));
            });
        }


        // --- Data Fetching & Processing ---
        async function fetchAndSetUser(username) {
            const userRes = await fetchWithCache(`${API_BASE}/user/${username}`);
            if (!userRes || !userRes.user_id) throw new Error('User not found.');
            state.userId = userRes.user_id;
        }

        async function fetchUserLeagues(userId) {
            const currentYear = new Date().getFullYear();
            const leaguesRes = await fetchWithCache(`${API_BASE}/user/${userId}/leagues/nfl/${currentYear}`);
            if (!leaguesRes || leaguesRes.length === 0) throw new Error(`No leagues found for this user for ${currentYear}.`);
            return leaguesRes;
        }

        async function fetchSleeperPlayers() {
            try { state.players = await fetchWithCache(`${API_BASE}/players/nfl`); } catch (e) { console.error("Failed to fetch Sleeper players:", e); }
        }
        
        async function fetchDataFromGoogleSheet() {
            const sheetNames = { oneQb: 'KTC_1QB', sflx: 'KTC_SFLX' };
            try {
                const [oneQbCsv, sflxCsv] = await Promise.all([
                    fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetNames.oneQb}`).then(res => res.text()),
                    fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetNames.sflx}`).then(res => res.text())
                ]);
                state.oneQbData = parseSheetData(oneQbCsv);
                state.sflxData = parseSheetData(sflxCsv);
            } catch (e) { console.error("Fatal Error: Could not fetch data from Google Sheet.", e); }
        }

        function parseSheetData(csvText) {
            const dataMap = {};
            const lines = csvText.split(/\r?\n/).slice(1);
            lines.forEach(line => {
                const columns = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (columns.length < 13) return;
                const clean = (str) => str ? str.replace(/"/g, '').trim() : '';
                const pos = clean(columns[2]);
                const sleeperId = clean(columns[12]);
                const adp = parseFloat(clean(columns[11]));
                const ktcValue = parseInt(clean(columns[6]), 10);
                const posRank = clean(columns[7]);
                const age = parseFloat(clean(columns[3])); // CORRECTED: Read age from the 4th column (index 3)

                if (pos === 'RDP') {
                    const pickName = clean(columns[1]);
                    if (pickName) dataMap[pickName] = { adp: null, ktc: ktcValue, posRank: null };
                } else if (sleeperId && sleeperId !== 'NA') {
                    // Add the parsed age to the player's data object
                    dataMap[sleeperId] = { 
                        age: isNaN(age) ? null : age, 
                        adp: isNaN(adp) ? null : adp, 
                        ktc: isNaN(ktcValue) ? null : ktcValue, 
                        posRank: posRank 
                    };
                }
            });
            return dataMap;
        }

        function processRosterData(rosters, users, tradedPicks, leagueInfo) {
            const userMap = users.reduce((acc, user) => ({ ...acc, [user.user_id]: user }), {});
            const rosterPositions = leagueInfo.roster_positions;
            const taxiSlots = leagueInfo.settings.taxi_slots || 0;

            const teams = rosters.map(roster => {
                const owner = userMap[roster.owner_id];
                const allPlayers = roster.players || [];
                
                const starterIds = roster.starters || [];
                const starters = starterIds.map((playerId, index) => {
                    const slot = rosterPositions[index] || 'FLEX';
                    return getPlayerData(playerId, slot);
                }).sort((a, b) => STARTER_ORDER.indexOf(a.slot) - STARTER_ORDER.indexOf(b.slot));

                const currentTaxiPlayers = (roster.taxi || []).map(p => getPlayerData(p, 'TX')).sort((a, b) => (b.ktc || 0) - (a.ktc || 0));
                const emptyTaxiSlots = Array(Math.max(0, taxiSlots - currentTaxiPlayers.length)).fill({ isPlaceholder: true });
                const taxi = [...currentTaxiPlayers, ...emptyTaxiSlots];

                const bench = allPlayers.filter(pId => pId && !starterIds.includes(pId) && !(roster.taxi || []).includes(pId));
                const draftPicks = getOwnedPicks(roster.roster_id, tradedPicks, leagueInfo);
                
                return {
                    isUserTeam: roster.owner_id === state.userId,
                    teamName: owner?.display_name || `Team ${roster.roster_id}`,
                    starters,
                    bench: bench.map(p => getPlayerData(p, 'BN')).sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
                    taxi,
                    draftPicks: draftPicks.map(p => getPickData(p, leagueInfo)),
                    allPlayers: allPlayers.map(pId => getPlayerData(pId, ''))
                };
            });
            
            state.currentTeams = teams;

            return teams.sort((a, b) => {
                if (a.isUserTeam) return -1;
                if (b.isUserTeam) return 1;
                return a.teamName.localeCompare(b.teamName);
            });
        }
        
        function getOwnedPicks(rosterId, tradedPicks, leagueInfo) {
            const defaultRounds = leagueInfo.settings.draft_rounds || 5;
            const leagueSeason = parseInt(leagueInfo.season);
            const firstPickSeason = leagueSeason + 1;
            let ownedPicks = [];

            for (let i = 0; i < 4; i++) {
                const season = firstPickSeason + i;
                for (let round = 1; round <= defaultRounds; round++) {
                    ownedPicks.push({ season: String(season), round, original_owner_id: rosterId });
                }
            }

            tradedPicks.forEach(pick => {
                if (pick.roster_id === rosterId && pick.owner_id !== rosterId) {
                    const i = ownedPicks.findIndex(p => p.season === pick.season && p.round === pick.round && p.original_owner_id === rosterId);
                    if (i > -1) ownedPicks.splice(i, 1);
                }
                if (pick.owner_id === rosterId && pick.roster_id !== rosterId) {
                    if (parseInt(pick.season) >= firstPickSeason) {
                        ownedPicks.push({ season: pick.season, round: pick.round, original_owner_id: pick.roster_id });
                    }
                }
            });
            ownedPicks = ownedPicks.filter(p => parseInt(p.season) < 2029);
            return ownedPicks.sort((a, b) => a.season.localeCompare(b.season) || a.round - b.round);
        }

        function getPlayerData(playerId, slot) {
            const player = state.players[playerId];
            if (!player) return { id: playerId, name: 'Unknown Player', pos: '?', age: '?', team: '?', adp: null, ktc: null, slot, posRank: null };
            const valueData = state.isSuperflex ? state.sflxData[playerId] : state.oneQbData[playerId];
            let lastName = player.last_name || '';
            if (lastName.includes('-')) lastName = lastName.split('-')[0];
            let displayName = `${player.first_name.charAt(0)}. ${lastName}`;
            if (displayName.length > 15) displayName = displayName.substring(0, 14) + '…';

            // Prioritize age from the sheet and format it to one decimal place
            const ageFromSheet = valueData?.age;
            const formattedAge = (typeof ageFromSheet === 'number') ? ageFromSheet.toFixed(1) : (player.age ? Number(player.age).toFixed(1) : '?');

            return { 
                id: playerId, 
                name: displayName, 
                pos: player.position || '?', 
                age: formattedAge, // Use the new formatted age
                team: player.team || 'FA', 
                adp: valueData?.adp || null, 
                ktc: valueData?.ktc || null, 
                slot, 
                posRank: valueData?.posRank || null 
            };
        }

        function getPickData(pick) {
            const { season, round } = pick;
            const label = `${season} ${ordinalSuffix(round)}`;
            const staticVals = { oneqb: { 1: 5200, 2: 3200, 3: 2000, 4: 1200, 5: 400 }, sflx: { 1: 4300, 2: 2600, 3: 1700, 4: 1000, 5: 400 } };
            let ktc = null;
            if (parseInt(season) >= 2028 || round >= 5) {
                ktc = (state.isSuperflex ? staticVals.sflx : staticVals.oneqb)[round] || null;
            } else {
                const sfx = round === 1 ? 'st' : round === 2 ? 'nd' : round === 3 ? 'rd' : 'th';
                const ktcKey = `${season} Mid ${round}${sfx}`;
                const dataSet = state.isSuperflex ? state.sflxData : state.oneQbData;
                ktc = dataSet[ktcKey]?.ktc || null;
            }
            return { label, ktc, id: `${season}-${round}-${pick.original_owner_id}` };
        }

        // --- UI Rendering ---
        function populateLeagueSelect(leagues) {
            leagueSelect.innerHTML = '<option>Select a league...</option>';
            leagues.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.league_id;
                opt.textContent = l.name;
                leagueSelect.appendChild(opt);
            });
            leagueSelect.disabled = false;
        }

        function renderAllTeamData(teams) {
            rosterGrid.innerHTML = '';
            rosterGrid.style.justifyContent = ''; // Reset style

            let teamsToRender = teams;
            if (state.isCompareMode) {
                teamsToRender = teams.filter(team => state.teamsToCompare.has(team.teamName));
                rosterGrid.style.justifyContent = 'center';
            }

            teamsToRender.forEach(team => {
                const columnWrapper = document.createElement('div');
                columnWrapper.className = 'roster-column';
                columnWrapper.dataset.teamName = team.teamName;
                
                const header = document.createElement('div');
                header.className = 'team-header-item';
                
                const checkbox = document.createElement('div');
                checkbox.className = 'team-compare-checkbox';
                if (state.teamsToCompare.has(team.teamName)) {
                    checkbox.classList.add('selected');
                }
                checkbox.dataset.teamName = team.teamName;
                
                const teamNameSpan = document.createElement('span');
                teamNameSpan.className = 'team-name';
                teamNameSpan.textContent = team.teamName;
                header.title = team.teamName;
                
                
                header.appendChild(checkbox);
                header.appendChild(teamNameSpan);
                
                const card = state.currentRosterView === 'positional' ? createPositionalTeamCard(team) : createDepthChartTeamCard(team);
                
                columnWrapper.appendChild(header);
                columnWrapper.appendChild(card);
                rosterGrid.appendChild(columnWrapper);
            });
        }

        function createDepthChartTeamCard(team) {
            const card = document.createElement('div');
            card.className = 'team-card';
            card.innerHTML = `<div class="roster-section starters-section"><h3>Starters</h3></div><div class="roster-section bench-section"><h3>Bench</h3></div><div class="roster-section taxi-section"><h3>Taxi</h3></div><div class="roster-section picks-section"><h3>Draft Picks</h3></div>`;
            
            const filterActive = state.activePositions.size > 0;
            const filterFunc = player => !filterActive || state.activePositions.has(player.pos) || (state.activePositions.has('FLX') && ['RB', 'WR', 'TE'].includes(player.pos));

            const populate = (sel, data, creator) => {
                const el = card.querySelector(sel);
                const filteredData = data.filter(item => item.isPlaceholder || filterFunc(item));
                
                const h3 = el.querySelector('h3');
                el.innerHTML = '';
                el.appendChild(h3);

                if (filteredData.length > 0) {
                    filteredData.forEach(item => el.appendChild(creator(item, team.teamName)));
                } else {
                    el.innerHTML += `<div class="text-xs text-slate-500 p-1 italic">None</div>`;
                }
            };

            populate('.starters-section', team.starters, createPlayerRow);
            populate('.bench-section', team.bench, createPlayerRow);
            populate('.taxi-section', team.taxi, createTaxiRow);
            
            const picksEl = card.querySelector('.picks-section');
            const picksH3 = picksEl.querySelector('h3');
            picksEl.innerHTML = '';
            picksEl.appendChild(picksH3);
            if (team.draftPicks && team.draftPicks.length > 0) {
                team.draftPicks.forEach(item => picksEl.appendChild(createPickRow(item, team.teamName)));
            } else {
                picksEl.innerHTML += `<div class="text-xs text-slate-500 p-1 italic">None</div>`;
            }
            return card;
        }

        function createPositionalTeamCard(team) {
            const card = document.createElement('div');
            card.className = 'team-card';
            card.innerHTML = `
                <div class="roster-section qb-section"><h3>QB</h3></div>
                <div class="roster-section rb-section"><h3>RB</h3></div>
                <div class="roster-section wr-section"><h3>WR</h3></div>
                <div class="roster-section te-section"><h3>TE</h3></div>
                <div class="roster-section picks-section"><h3>Draft Picks</h3></div>
            `;

            const filterActive = state.activePositions.size > 0;
            const isFlexActive = state.activePositions.has('FLX');

            const positions = {
                QB: team.allPlayers.filter(p => p.pos === 'QB').sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
                RB: team.allPlayers.filter(p => p.pos === 'RB').sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
                WR: team.allPlayers.filter(p => p.pos === 'WR').sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
                TE: team.allPlayers.filter(p => p.pos === 'TE').sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
            };

            const populate = (sel, data, creator) => {
                const el = card.querySelector(sel);
                const pos = sel.split('-')[0].toUpperCase().replace('.', '');
                
                el.style.display = 'none';
                if (!filterActive || state.activePositions.has(pos) || (isFlexActive && ['RB', 'WR', 'TE'].includes(pos))) {
                    el.style.display = 'block';
                    const h3 = el.querySelector('h3');
                    el.innerHTML = '';
                    el.appendChild(h3);
                    if (data && data.length > 0) {
                        data.forEach(item => el.appendChild(creator(item, team.teamName)));
                    } else {
                        el.innerHTML += `<div class="text-xs text-slate-500 p-1 italic">None</div>`;
                    }
                }
            };

            populate('.qb-section', positions.QB, createPlayerRow);
            populate('.rb-section', positions.RB, createPlayerRow);
            populate('.wr-section', positions.WR, createPlayerRow);
            populate('.te-section', positions.TE, createPlayerRow);
            
            const picksEl = card.querySelector('.picks-section');
            if (picksEl) {
                const picksH3 = picksEl.querySelector('h3');
                picksEl.innerHTML = '';
                picksEl.appendChild(picksH3);
                if (team.draftPicks && team.draftPicks.length > 0) {
                    team.draftPicks.forEach(item => picksEl.appendChild(createPickRow(item, team.teamName)));
                } else {
                    picksEl.innerHTML += `<div class="text-xs text-slate-500 p-1 italic">None</div>`;
                }
            }
            return card;
        }

        function createEmptyTaxiRow() {
            const row = document.createElement('div');
            row.className = 'player-row';
            row.innerHTML = `<span style="color: var(--color-text-tertiary); font-style: italic; font-size: 0.8rem; padding: 1.2rem 0.5rem; display: block; width: 100%; text-align: center;">Empty Slot</span>`;
            return row;
        }
        
        function createTaxiRow(item, teamName) {
            if (item.isPlaceholder) return createEmptyTaxiRow();
            return createPlayerRow(item, teamName);
        }

        function createPlayerRow(player, teamName) {
            const row = document.createElement('div');
            row.className = 'player-row';
            row.dataset.assetId = player.id;
            row.dataset.assetLabel = player.name;
            row.dataset.assetKtc = player.ktc || 0;

            if (state.tradeBlock[teamName]?.find(a => a.id === player.id)) {
                row.classList.add('player-selected');
            }

            const adp = player.adp ? player.adp.toFixed(1) : '—';
            const ktc = player.ktc || '—';
            const slotAbbr = { 'SUPER_FLEX': 'SFLX', 'FLEX': 'FLX' };
            const displaySlot = state.currentRosterView === 'depth' ? (slotAbbr[player.slot] || player.slot) : player.pos;
            const teamTagHTML = player.team && player.team !== 'FA' 
                ? `<div class="team-tag" style="background-color: ${TEAM_COLORS[player.team] || '#64748b'}; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${player.team}</div>` 
                : `<div class="team-tag" style="background-color: #64748b; color: white;">${player.team || 'FA'}</div>`;

            const posRankColor = getPosRankColor(player.posRank);

            row.innerHTML = `
                <div class="player-main-line">
                    <div class="player-tag" style="background-color: ${TAG_COLORS[displaySlot] || 'var(--pos-bn)'};">${displaySlot}</div>
                    <div class="player-name">${player.name}</div>
                </div>
                <div class="player-meta-line">
                    <span class="player-pos-rank" style="color: ${posRankColor}; font-weight: 400;">${player.posRank || player.pos}</span>
                    <span class="separator">•</span>
                    <span>Age: <span class="player-age">${player.age || '?'}</span></span>
                    <span class="separator">•</span>
                    ${teamTagHTML}
                </div>
                <div class="player-value-line">
                    <span>KTC: <span class="value player-ktc">${ktc}</span></span>
                    <span>ADP: <span class="value player-adp">${adp}</span></span>
                </div>
            `;
            
            const ageEl = row.querySelector('.player-age'), adpEl = row.querySelector('.player-adp'), ktcEl = row.querySelector('.player-ktc');
            if (ageEl && player.age && player.age !== '?') ageEl.style.color = getAgeColorForRoster(player.pos, parseFloat(player.age));
            if (adpEl && player.adp) adpEl.style.color = getAdpColorForRoster(parseFloat(adp));
            if (ktcEl && player.ktc) ktcEl.style.color = getKtcColor(player.ktc);
            return row;
        }

        function createPickRow(pick, teamName) {
            const row = document.createElement('div');
            row.className = 'pick-row';
            row.dataset.assetId = pick.id;
            row.dataset.assetLabel = pick.label;
            row.dataset.assetKtc = pick.ktc || 0;

            if (state.tradeBlock[teamName]?.find(a => a.id === pick.id)) {
                row.classList.add('player-selected');
            }
            
            const ktcValue = pick.ktc || '—';
            row.innerHTML = `<span class="pick-label">${pick.label}</span><span class="pick-ktc">KTC: <span class="value">${ktcValue}</span></span>`;
            if (pick.ktc) row.querySelector('.pick-ktc .value').style.color = getKtcColor(pick.ktc);
            return row;
        }

        function renderTradeBlock() {
            if (!state.isCompareMode || state.teamsToCompare.size < 2) {
                tradeSimulator.style.display = 'none';
                mainContent.style.paddingBottom = '1rem';
                return;
            }

            tradeSimulator.style.display = 'block';
            tradeSimulator.innerHTML = `
                <div class="trade-container glass-panel">
                    <div class="trade-header">
                        <h3>Trade Preview</h3>
                        <button id="clearTradeButton">Clear</button>
                    </div>
                    <div class="trade-body"></div>
                </div>
            `;

            const tradeBody = tradeSimulator.querySelector('.trade-body');
            const teamNames = Array.from(state.teamsToCompare);
            const tradeData = {};

            teamNames.forEach(name => {
                const assets = state.tradeBlock[name] || [];
                const totalKtc = assets.reduce((sum, asset) => sum + asset.ktc, 0);
                tradeData[name] = { assets, totalKtc };
            });

            const totals = teamNames.map(name => tradeData[name].totalKtc);
            const totalClasses = {};

            if (teamNames.length === 2) {
                const diff = totals[0] - totals[1];
                if (diff > 500) {
                    totalClasses[teamNames[0]] = 'winning';
                    totalClasses[teamNames[1]] = 'losing';
                } else if (diff < -500) {
                    totalClasses[teamNames[0]] = 'losing';
                    totalClasses[teamNames[1]] = 'winning';
                } else {
                    totalClasses[teamNames[0]] = 'even';
                    totalClasses[teamNames[1]] = 'even';
                }
            }

            let bodyHtml = '';
            teamNames.forEach((teamName, index) => {
                const { assets, totalKtc } = tradeData[teamName];
                let assetsHTML = '';
                if (assets.length > 0) {
                    assets.forEach(asset => {
                        const ktcColor = getKtcColor(asset.ktc);
                        assetsHTML += `<div class="trade-asset-chip"><span>${asset.label}</span><span class="ktc" style="color: ${ktcColor}">(${asset.ktc})</span></div>`;
                    });
                } else {
                    assetsHTML = `<span class="text-xs text-slate-500 p-2">Select assets...</span>`;
                }
                
                const totalClass = totalClasses[teamName] || 'even';

                bodyHtml += `
                    <div class="trade-team-column">
                        <h4>${teamName}</h4>
                        <div class="trade-assets">${assetsHTML}</div>
                        <div class="trade-total ${totalClass}">
                            Total KTC: ${totalKtc}
                        </div>
                    </div>
                `;

                if (index < teamNames.length - 1 && teamNames.length > 1) {
                     bodyHtml += `<div class="trade-divider"></div>`;
                }
            });
            
            tradeBody.innerHTML = bodyHtml;

            document.getElementById('clearTradeButton').addEventListener('click', clearTrade);
            mainContent.style.paddingBottom = `${tradeSimulator.offsetHeight + 40}px`;
        }


        // --- Player List (Ownership) Functions ---
        async function renderPlayerList() {
    hideLegend();
            playerListView.innerHTML = '<p class="text-center p-4">Fetching user leagues and rosters...</p>';
            assignedLeagueColors.clear();
            nextColorIndex = 0;
            assignedRyColors.clear();
            nextRyColorIndex = 0;

            const userLeagues = await fetchUserLeagues(state.userId);
            const rostersByLeague = await Promise.all(userLeagues.map(l => fetchWithCache(`${API_BASE}/league/${l.league_id}/rosters`)));

            const agg = new Map();
            rostersByLeague.forEach((rosters, idx) => {
                const leagueName = userLeagues[idx].name;
                const leagueAbbr = getLeagueAbbr(leagueName);
                const myRoster = rosters.find(r => r.owner_id === state.userId || (Array.isArray(r.co_owners) && r.co_owners.includes(state.userId)));
                if (!myRoster) return;
                const pids = new Set((myRoster.players || []).filter(Boolean));
                pids.forEach(pid => {
                    if (!agg.has(pid)) agg.set(pid, new Set());
                    agg.get(pid).add(leagueAbbr);
                });
            });

            const section = document.createElement('div');
            section.className = 'player-list-section';
            
            const header = createPlayerListHeader();
            section.appendChild(header);

            const rows = Array.from(agg.entries()).map(([pid, leagueSet]) => createPlayerListRow(pid, leagueSet, userLeagues.length)).filter(Boolean);
            rows.sort((a, b) => {
                const countDiff = Number(b.dataset.count || 0) - Number(a.dataset.count || 0);
                if (countDiff !== 0) return countDiff;
                return a.dataset.search.localeCompare(b.dataset.search);
            });

            rows.forEach(r => section.appendChild(r));
            playerListView.innerHTML = '';
            
            const searchInput = document.createElement('input');
            searchInput.id = 'playerSearch';
            searchInput.type = 'text';
            searchInput.placeholder = 'Filter players by name...';
            playerListView.appendChild(searchInput);
            playerListView.appendChild(section);

            searchInput.oninput = () => {
                const term = searchInput.value.trim().toLowerCase();
                section.querySelectorAll('.pl-player-row:not(.pl-list-header)').forEach(r => {
                    r.style.display = (r.dataset.search || '').includes(term) ? 'flex' : 'none';
                });
            };
        }

        function createPlayerListHeader() {
            const header = document.createElement('div');
            header.className = 'pl-player-row pl-list-header';
            
            const tagSpacer = document.createElement('div');
            tagSpacer.className = 'pl-list-tag-spacer';
            header.appendChild(tagSpacer);

            const headerInfo = document.createElement('div');
            headerInfo.className = 'pl-player-info';
            headerInfo.innerHTML = '<div class="pl-player-name">Player & Info</div>';
            header.appendChild(headerInfo);

            const headerMeta = document.createElement('div');
            headerMeta.className = 'pl-right-meta';
            headerMeta.innerHTML = `
                <span class="pl-col-count">#</span>
                <span class="pl-col-pct">%</span>
                <span class="pl-col-lgs">Leagues</span>
            `;
            header.appendChild(headerMeta);
            
            return header;
        }

        function createPlayerListRow(pid, leagueSet, totalLeagues) {
            const p = state.players[pid];
            if (!p) return null;

            const pos = p.position || (p.fantasy_positions && p.fantasy_positions[0]) || '';
            const first = (p.first_name || '').trim();
            const last = (p.last_name || '').trim();
            let displayName = `${first} ${last}`.trim() || pid;
            if (first && last) displayName = `${first.charAt(0)}. ${last}`;
            if (displayName.length > 14) displayName = displayName.substring(0, 14) + '…';


            const row = document.createElement('div');
            row.className = 'pl-player-row';
            row.dataset.search = `${first.toLowerCase()} ${last.toLowerCase()} ${displayName.toLowerCase()}`;
            row.dataset.count = leagueSet.size;

            const valueData = state.isSuperflex ? state.sflxData[pid] : state.oneQbData[pid];
            const ageFromSheet = valueData?.age;
            const formattedAge = (typeof ageFromSheet === 'number') ? ageFromSheet.toFixed(1) : (p.age ? Number(p.age).toFixed(1) : '?');

            const detailParts = [];
            const adp1QB = state.oneQbData[pid]?.adp;
            const adpSFLX = state.sflxData[pid]?.adp;
            const rookieYear = deriveRookieYear(p);
            if (adp1QB) detailParts.push(`ADP <span style="color:${getAdpColorForRoster(adp1QB) || 'inherit'}">${adp1QB.toFixed(1)}</span>`);
            if (adpSFLX) detailParts.push(`SFLX <span style="color:${getAdpColorForRoster(adpSFLX) || 'inherit'}">${adpSFLX.toFixed(1)}</span>`);
            if (rookieYear) {
                const ryAbbr = String(rookieYear).slice(-2);
                detailParts.push(`RY-<span style="color:${getRyColor(rookieYear) || 'inherit'}">${ryAbbr}</span>`);
            }
            const detailsHTML = detailParts.join(' • ');

            const count = leagueSet.size;
            const pctVal = Math.round((count / totalLeagues) * 100);
            let countClass, pctClass;
            if (pctVal >= 80) { countClass = 'pl-count-high'; pctClass = 'pl-pct-high'; }
            else if (pctVal >= 50) { countClass = 'pl-count-mid'; pctClass = 'pl-pct-mid'; }
            else { countClass = 'pl-count-low'; pctClass = 'pl-pct-low'; }

            const sortedAbbrs = Array.from(leagueSet).sort();
            const leaguesHTML = sortedAbbrs.map((abbr, index) => `<span style="color: ${getLeagueColor(abbr)}">${abbr}</span>`).join(', ');

            row.innerHTML = `
                <div class="pl-list-tag" style="background-color: ${TAG_COLORS[pos] || 'var(--pos-bn)'};">${pos}</div>
                <div class="pl-player-info">
                    <div class="pl-player-name">
                        <span>${displayName}</span>
                        <div class="team-tag" style="background-color: ${TEAM_COLORS[p.team] || '#64748b'}; color: white;">${p.team || 'FA'}</div>
                        ${formattedAge !== '?' ? `<span style="font-size: 0.8rem; color: var(--color-text-tertiary);">Age: <span style="color:${getAgeColorForRoster(p.position, parseFloat(formattedAge)) || 'inherit'}">${formattedAge}</span></span>` : ''}
                    </div>
                    <div class="pl-player-details">${detailsHTML}</div>
                </div>
                <div class="pl-right-meta">
                    <span class="pl-col-count ${countClass}">${count}</span>
                    <span class="pl-col-pct ${pctClass}">${pctVal}%</span>
                    <span class="pl-col-lgs">${leaguesHTML}</span>
                </div>
            `;
            
            return row;
        }

        // --- Formatting Helpers ---
        function deriveRookieYear(player) {
            if (!player) return null;
            let ry = player.metadata?.rookie_year ? Number(player.metadata.rookie_year) : 0;
            const exp = player.years_exp;
            const expNum = (exp === '' || exp === null || exp === undefined) ? null : Number(exp);
            if ((!ry || ry === 0) && expNum === 0) {
                return new Date().getFullYear();
            }
            return ry > 0 ? ry : null;
        }
        function getPosRankColor(posRank) {
            if (!posRank || typeof posRank !== 'string') return 'var(--color-text-secondary)';
            const position = posRank.split('·')[0];
            const colors = {
                QB: '#FF7AB2',
                RB: '#bbf7e0',
                WR: '#A0C2F7',
                TE: '#ffae58'
            };
            return colors[position] || 'var(--color-text-secondary)';
        }
        function getKtcColor(v){const s=[{v:9e3,c:"#00EEB6"},{v:8e3,c:"#14D7CB"},{v:7e3,c:"#0599AA"},{v:6e3,c:"#03a8ce"},{v:5500,c:"#0690DC"},{v:5e3,c:"#066CDC"},{v:4500,c:"#1350fd"},{v:4e3,c:"#5e41ff"},{v:3750,c:"#7158ff"},{v:3500,c:"#964eff"},{v:3250,c:"#9200ff"},{v:3e3,c:"#b70fff"},{v:2750,c:"#ba00cc"},{v:2500,c:"#e800ff"},{v:2250,c:"#db00af"},{v:2e3,c:"#c70097"},{v:0,c:"#FF0080"}];if(v===null||v===0)return"#e0e6ed";for(const t of s)if(v>=t.v)return t.c;return s[s.length-1].c}
        function getAdpColorForRoster(a){const s=[{v:12,c:"#00EEB6"},{v:24,c:"#14D7CB"},{v:36,c:"#0599AA"},{v:48,c:"#03a8ce"},{v:60,c:"#0690DC"},{v:72,c:"#066CDC"},{v:84,c:"#1350fd"},{v:96,c:"#5e41ff"},{v:108,c:"#7158ff"},{v:120,c:"#964eff"},{v:144,c:"#9200ff"},{v:168,c:"#b70fff"},{v:192,c:"#ba00cc"},{v:216,c:"#e800ff"},{v:240,c:"#db00af"},{v:280,c:"#c70097"},{v:320,c:"#FF0080"}];if(!a||a===0)return null;for(const t of s)if(a<=t.v)return t.c;return s[s.length-1].c}
        function getAgeColorForRoster(p,a){const s={wrTe:[{v:22.5,c:"#00ffc4"},{v:25,c:"#85fff3"},{v:26,c:"#56dfe8"},{v:27,c:"#7dd1ff"},{v:29,c:"#89a3ff"},{v:30,c:"#957cff"},{v:31,c:"#a642ff"},{v:32,c:"#cf60ff"},{v:33,c:"#ff6fe1"}],rb:[{v:22.5,c:"#00ffc4"},{v:24,c:"#85fff3"},{v:25,c:"#56dfe8"},{v:26,c:"#7dd1ff"},{v:27,c:"#89a3ff"},{v:28,c:"#957cff"},{v:29,c:"#a642ff"},{v:30,c:"#cf60ff"},{v:31,c:"#ff6fe1"}],qb:[{v:25.5,c:"#00ffc4"},{v:28,c:"#85fff3"},{v:29,c:"#7dd1ff"},{v:31,c:"#48a6ff"},{v:33,c:"#957cff"},{v:36,c:"#a642ff"},{v:40,c:"#cf60ff"},{v:44,c:"#ff6fe1"}]};let sc=p==="WR"||p==="TE"?s.wrTe:p==="RB"?s.rb:p==="QB"?s.qb:null;if(!sc||!a||a===0)return null;for(const t of sc)if(a<=t.v)return t.c;return sc[sc.length-1].c}
       function getLeagueAbbr(name) {
            if (!name) return "LG";
            const trimmed = name.trim();                       const normalized = trimmed.toLowerCase().replace(/[.,()]/g, '');
            if (LEAGUE_ABBR_OVERRIDES[normalized]) return LEAGUE_ABBR_OVERRIDES[normalized];
            if (trimmed.length <= 4 && !trimmed.includes(' ') && !trimmed.includes('-')) return trimmed.toUpperCase();
            const words = trimmed.split(/[\s-]+/);
            let abbr = words.map(w => w[0] || '').join('');
            return abbr.toUpperCase();
        }
         function getLeagueColor(abbr) { if (!assignedLeagueColors.has(abbr)) { assignedLeagueColors.set(abbr, LEAGUE_COLOR_PALETTE[nextColorIndex % LEAGUE_COLOR_PALETTE.length]); nextColorIndex++; } return assignedLeagueColors.get(abbr); }
        function getRyColor(year) { if (!assignedRyColors.has(year)) { assignedRyColors.set(year, RY_COLOR_PALETTE[nextRyColorIndex % RY_COLOR_PALETTE.length]); nextRyColorIndex++; } return assignedRyColors.get(year); }
        function ordinalSuffix(i){ const j=i%10, k=i%100; if(j===1&&k!==11) return i+'st'; if(j===2&&k!==12) return i+'nd'; if(j===3&&k!==13) return i+'rd'; return i+'th'; }

        // --- Utility Functions ---
        function setLoading(isLoading, message = 'Loading...') {
            welcomeScreen?.classList.add('hidden');
            const buttons = [fetchRostersButton, fetchOwnershipButton].filter(Boolean);
            if (isLoading) {
                loadingIndicator.textContent = message;
                loadingIndicator.classList.remove('hidden');
                buttons.forEach(btn => { btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed'); });
            } else {
                loadingIndicator.classList.add('hidden');
                buttons.forEach(btn => { btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed'); });
            }
        }

        function handleError(error, username) {
            console.error(`Error for user ${username}:`, error);
            if (welcomeScreen) {
                welcomeScreen.classList.remove('hidden');
                welcomeScreen.innerHTML = `<h2 class="text-red-400">Error</h2><p>Could not fetch data for user: ${username}</p><p>${error.message}</p>`;
            }
            rosterView?.classList.add('hidden');
            playerListView?.classList.add('hidden');
        }

        async function fetchWithCache(url) {
            if (state.cache[url]) return state.cache[url];
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
            const data = await response.json();
            state.cache[url] = data;
            return data;
        }
    


(function(){
  const KEY = 'sleeper_username';
  const input = document.getElementById('usernameInput');
  if (!input) return;

  const normalize = () => (input.value || '').trim().toLowerCase();

  function persistNormalized() {
    const v = normalize();
    input.value = v;
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
    if (document.activeElement === input) input.blur();
  }

  // iOS viewport reset helper (temporary max-scale=1 toggle)
  function resetIOSZoom() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const orig = meta.getAttribute('content') || 'width=device-width, initial-scale=1';
    const cleaned = orig
      .replace(/\s*,?\s*maximum-scale\s*=\s*[^,]+/gi, '')
      .replace(/\s*,?\s*user-scalable\s*=\s*[^,]+/gi, '');
    meta.setAttribute('content', cleaned + ', maximum-scale=1, user-scalable=no');
    setTimeout(() => meta.setAttribute('content', cleaned), 300);
  }

  // hydrate
  const saved = (localStorage.getItem(KEY) || '').trim();
  if (saved) input.value = saved; else { input.removeAttribute('value'); input.value = ''; }

  // listeners
  input.addEventListener('change', persistNormalized);
  input.addEventListener('blur', () => { persistNormalized(); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { persistNormalized(); resetIOSZoom(); }});

  // Hook buttons (capture) so normalization executes before fetch handlers, then reset zoom
  ['fetchRostersButton','fetchOwnershipButton'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => { persistNormalized(); resetIOSZoom(); }, { capture: true });
  });
})();


// === Hotfix guards (20250825104842) ===
(function(){ 
  const welcome = document.getElementById('welcome-screen');
  const legend  = document.getElementById('legend-section');
  const roster  = document.getElementById('rosterView');
  const list    = document.getElementById('playerListView');

  function setWelcomeWidthVar(){ 
    if (!welcome) return; 
    const w = Math.round(welcome.getBoundingClientRect().width);
    document.documentElement.style.setProperty('--welcome-width', w>0? w+'px' : '720px');
  }
  function enforceLegendVisibility(){ 
    if (!legend) return;
    const onWelcome = welcome && !welcome.classList.contains('hidden');
    const rosterVisible = roster && !roster.classList.contains('hidden');
    const listVisible = list && !list.classList.contains('hidden');
    // Only show legend on welcome, otherwise hide
    legend.classList.toggle('hidden', !(onWelcome && !rosterVisible && !listVisible));
  }

  window.addEventListener('load', () => { setWelcomeWidthVar(); enforceLegendVisibility(); });
  window.addEventListener('resize', setWelcomeWidthVar);
  if (welcome) new MutationObserver(() => { enforceLegendVisibility(); setWelcomeWidthVar(); }).observe(welcome, { attributes:true, attributeFilter:['class'] });
  if (roster)  new MutationObserver(enforceLegendVisibility).observe(roster,  { attributes:true, attributeFilter:['class'] });
  if (list)    new MutationObserver(enforceLegendVisibility).observe(list,    { attributes:true, attributeFilter:['class'] });

  // Service worker update hard reload once
  navigator.serviceWorker && navigator.serviceWorker.addEventListener('controllerchange', () => { 
    if (!window.__reloadedOnce) { window.__reloadedOnce = true; location.reload(); }
  });
})();

// PWA registration (with version bump to bust old caches)
if ('serviceWorker' in navigator) {
  const swPath = pageType === 'welcome'
    ? 'service-worker.js?v=20250825104842'
    : '../service-worker.js?v=20250825104842';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swPath).catch(()=>{});
  });
}


// Hide legend when switching away from Welcome via UI controls
['rostersButton','ownershipButton','previewButton','leagueSelect','positionalViewBtn','depthChartViewBtn'].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', hideLegend, {capture:true});
});

/* one-shot legend guard */
document.addEventListener('DOMContentLoaded', function(){
  var legend = document.getElementById('legend-section');
  var roster = document.getElementById('rosterView');
  var list   = document.getElementById('playerListView');
  if (legend && ((roster && !roster.classList.contains('hidden')) || (list && !list.classList.contains('hidden')))) {
    legend.classList.add('hidden');
  }
});
