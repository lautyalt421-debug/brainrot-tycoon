 1000;
    const diff = now - state.lastAdminUse;

    if (diff > cooldown) {
        btn.innerText = "ADMIN: READY";
        btn.style.color = "#00ff00";
        btn.onclick = () => {
            state.money += 10000;
            state.lastAdminUse = Date.now();
            alert("ADMIN ABUSE: +$10,000");
        };
    } else {
        const remaining = Math.ceil((cooldown - diff) / 1000);
        btn.innerText = `ADMIN: ${remaining}s`;
        btn.style.color = "#ff4444";
        btn.onclick = null;
    }
}

function renderBase() {
    const grid = document.getElementById('base_grid');
    grid.innerHTML = "";
    document.getElementById('slot_count').innerText = `${state.inventory.length}/${state.maxSlots}`;
    
    for(let i=0; i < state.maxSlots; i++) {
        const item = state.inventory[i];
        grid.innerHTML += item 
            ? `<div class="slot occupied"><b>${item.name}</b><br>${item.rarity}</div>`
            : `<div class="slot">-------</div>`;
    }
}

function tryRebirth() {
    const cost = 10000000;
    if (state.money >= cost) {
        state.rebirthLevel++;
        state.money = 25;
        state.inventory = [];
        state.maxSlots += 2; // Bono de slots por rebirth
        calculateGPS();
        renderBase();
        alert("¡RENACISTE! Ahora ganas más dinero y tenés más pupitres.");
    } else {
        alert("Faltan $" + (cost - state.money).toLocaleString());
    }
}

function updateUI() {
    document.getElementById('money').innerText = Math.floor(state.money).toLocaleString();
    document.getElementById('gps').innerText = state.gps.toLocaleString();
    document.getElementById('rebirths').innerText = state.rebirthLevel;
}

init();
                <strong>${t.name}</strong><br>
                Gen: $${t.gps}/s | Costo: $${t.cost}
            </div>
            <button onclick="buyTeacher('${t.name}', ${t.cost}, ${t.gps})">ROBAR</button>
        </div>
    `).join('');
}

function renderBase() {
    const grid = document.getElementById('base_grid');
    grid.innerHTML = "";
    for(let i=0; i < state.maxSlots; i++) {
        const name = state.inventory[i] || "-----------";
        const isOccupied = state.inventory[i] ? "occupied" : "";
        grid.innerHTML += `<div class="slot ${isOccupied}">${name}</div>`;
    }
}

function buyTeacher(name, cost, gps) {
    if (state.money >= cost && state.inventory.length < state.maxSlots) {
        state.money -= cost;
        state.inventory.push(name);
        calculateGPS();
        renderBase();
        updateUI();
    } else {
        alert("Sin dinero o base llena!");
    }
}

function calculateGPS() {
    state.gps = state.inventory.reduce((sum, name) => {
        const t = teachersData.find(td => td.name === name);
        return sum + (t ? t.gps : 0);
    }, 0);
}

function updateUI() {
    document.getElementById('money').innerText = Math.floor(state.money);
    document.getElementById('gps').innerText = state.gps;
    document.getElementById('rebirths').innerText = state.rebirths;
}

// Iniciar juego
init();
            this.loadGame();
            this.setupAudio();
            this.startLoops();
        } catch (e) { console.error("Error cargando semillas:", e); }
    }

    setupAudio() {
        this.bgAudio = document.getElementById('audio_bg');
        this.adminAudio = document.getElementById('audio_admin');
        this.bgAudio.src = 'assets/music/bg_loop.wav';
        this.adminAudio.src = 'assets/music/admin_loop.wav';
    }

    // Selección de Especie (Sección 9)
    chooseSpecies() {
        let totalWeight = 0;
        const weights = this.database.map(s => {
            let w = s.probability;
            if (this.isAdminActive) {
                if (s.id === "aguirre" || s.id === "joaco") w *= 0.05;
                else w *= 1.25;
            }
            totalWeight += w;
            return w;
        });

        let r = Math.random() * totalWeight;
        for (let i = 0; i < this.database.length; i++) {
            if (r <= weights[i]) return this.database[i];
            r -= weights[i];
        }
        return this.database[0];
    }

    // Selección de Rareza (Sección 10)
    chooseRarity(speciesProb) {
        let luckMult = 1.0;
        if (this.isAdminActive) {
            const elapsed = (Date.now() - this.adminStartTime) / 1000;
            luckMult = 2 + (10 * (elapsed / this.adminDuration)); // x2 -> x12
        }

        const tiers = ["Dorado", "Diamante", "Rainbow", "Legendaria", "Mítica", "Cósmica"];
        for (const tierName of tiers) {
            const tierData = this.rarities[tierName];
            if (Math.random() * 100 < (speciesProb * tierData.chance_div * luckMult)) {
                return tierName;
            }
        }
        return "Normal";
    }

    spawnOffer() {
        if (this.offers.length >= this.MAX_OFFERS) return;

        const species = this.chooseSpecies();
        const rarityName = this.chooseRarity(species.probability);
        const rarityData = this.rarities[rarityName];

        const newOffer = {
            uid: "offer_" + Date.now(),
            name: species.name,
            id: species.id,
            rarity: rarityName,
            price: Math.round(species.price * rarityData.mult_price),
            gps: Math.round(species.gps * rarityData.mult_gps),
            sound: species.sound,
            x: 1200,
            state: "SPAWNING",
            spawnAt: Date.now(),
            waitStarted: 0
        };

        this.offers.push(newOffer);
        this.playSfx('spawn.wav');
    }

    economyTick() {
        // GPS Efectivo (Sección 8 y 12)
        const rbMult = [1, 1.15, 1.25, 1.40, 1.60, 2.0][this.rebirthLevel];
        const upgMult = 1 + (this.genUpgradeLevel * 0.15);
        const adminMult = this.isAdminActive ? 1.25 : 1.0;

        let totalGps = this.inventory.reduce((acc, item) => acc + item.gps, 0);
        totalGps = Math.floor(totalGps * rbMult * upgMult * adminMult);

        this.money += totalGps;
        this.updateHUD(totalGps);
    }

    stealOffer() {
        const target = this.offers.find(o => o.state === "WAITING");
        if (!target) return this.playSfx('error.wav');

        // Chance de robo (Sección 11)
        const baseChances = { "Normal": 15, "Dorado": 5, "Diamante": 1, "Rainbow": 0.5 };
        const factorGen = Math.min(Math.max(1 - Math.log10(target.gps + 1) * 0.07, 0.1), 1);
        const chance = (baseChances[target.rarity] || 0.1) * factorGen;

        if (Math.random() * 100 < chance) {
            this.addToInventory(target);
            this.offers = this.offers.filter(o => o.uid !== target.uid);
            this.playSfx('rob_success.wav');
        } else {
            this.failSteal();
        }
    }

    failSteal() {
        if (this.inventory.length > 0) {
            this.inventory.sort((a,b) => b.gps - a.gps);
            const lost = this.inventory.shift();
            alert(`¡FALLASTE! Perdiste a tu mejor brainrot: ${lost.name}`);
        }
        this.playSfx('rob_fail.wav');
    }

    // ... (Métodos de UI, Save/Load y Admin Abuse siguen la lógica del Doc Técnico)
    startLoops() {
        setInterval(() => this.economyTick(), 1000);
        setInterval(() => this.spawnOffer(), this.OFFER_INTERVAL);
        setInterval(() => this.saveGame(), 10000);
        this.renderLoop();
    }

    renderLoop() {
        const area = document.getElementById('offers_area');
        area.innerHTML = '';
        const now = Date.now();

        this.offers.forEach((off, idx) => {
            if (off.state === "SPAWNING") {
                off.x -= 5;
                if (off.x <= 400) { off.state = "WAITING"; off.waitStarted = now; }
            } else if (off.state === "WAITING") {
                if (now - off.waitStarted > 6000) off.state = "EXITING";
            } else {
                off.x -= 7;
                if (off.x < -250) this.offers.splice(idx, 1);
            }

            const card = document.createElement('div');
            card.className = `offer-card ${off.state === "WAITING" ? 'waiting' : ''} rarity-${off.rarity.toLowerCase()}`;
            card.style.left = off.x + 'px';
            card.innerHTML = `<h3>${off.name}</h3><p>${off.rarity}</p><p>$${off.price}</p><button onclick="game.buyOffer('${off.uid}')">COMPRAR</button>`;
            area.appendChild(card);
        });

        // Inventario
        const invList = document.getElementById('inventory_list');
        invList.innerHTML = '';
        this.inventory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `<b>${item.name}</b><br>${item.rarity}<br>+${item.gps}/s`;
            invList.appendChild(div);
        });

        requestAnimationFrame(() => this.renderLoop());
    }

    buyOffer(uid) {
        const off = this.offers.find(o => o.uid === uid);
        if (this.money >= off.price && this.inventory.length < this.maxSlots) {
            this.money -= off.price;
            this.addToInventory(off);
            this.offers = this.offers.filter(o => o.uid !== uid);
            this.playSfx(off.sound);
        } else { this.playSfx('error.wav'); }
    }

    addToInventory(off) {
        this.inventory.push({ name: off.name, rarity: off.rarity, gps: off.gps, price: off.price });
    }

    playSfx(file) {
        const a = new Audio(`assets/sounds/${file}`);
        a.play().catch(()=>{});
    }

    updateHUD(gps) {
        document.getElementById('money').innerText = `$${this.money.toLocaleString()}`;
        document.getElementById('gps').innerText = `+${gps}/s`;
        document.getElementById('slots').innerText = `${this.inventory.length}/${this.maxSlots}`;
        document.getElementById('rebirth_level').innerText = this.rebirthLevel;
    }

    saveGame() {
        const save = { money: this.money, inventory: this.inventory, maxSlots: this.maxSlots, rebirthLevel: this.rebirthLevel, genUpgradeLevel: this.genUpgradeLevel };
        localStorage.setItem('brainrot.save.v1', JSON.stringify(save));
    }

    loadGame() {
        const saved = localStorage.getItem('brainrot.save.v1');
        if (saved) Object.assign(this, JSON.parse(saved));
    }
}

const game = new BrainrotTycoon();
const BRAINROTS = {
    "Aguirrrrrre": {price: 27, gps: 2, prob: 90.0},
    "Joaco kaly": {price: 10, gps: 1, prob: 75.0},
    "Franquito": {price: 3300, gps: 50, prob: 45.0},
    "Gogieri": {price: 20000, gps: 250, prob: 42.0},
    "Nikalacahsca": {price: 100000000000000, gps: 67000000000, prob: 0.07}
};

const RARITIES = {
    "Normal": {mult: 1.0, color: "#c8c8c8"},
    "Dorado": {mult: 1.5, color: "#ffd700"},
    "Diamante": {mult: 3.0, color: "#00e5ff"}
};

let state = {
    money: 25,
    inventory: [],
    maxSlots: 4,
    rebirthLevel: 0
};

function init() {
    console.log("Juego iniciado");
    setInterval(tick, 1000);
    spawnOffers();
    renderBase();

    document.getElementById('btn-click').onclick = () => {
        state.money += (1 + state.rebirthLevel);
        updateUI();
    };

    document.getElementById('btn-rebirth').onclick = () => {
        if (state.money >= 10000000) {
            state.rebirthLevel++;
            state.money = 25;
            state.inventory = [];
            state.maxSlots += 2;
            renderBase();
            updateUI();
            alert("¡Renaciste!");
        } else {
            alert("Necesitás $10.000.000");
        }
    };
}

function tick() {
    let totalGps = state.inventory.reduce((sum, item) => sum + item.gps, 0);
    state.money += totalGps;
    updateUI(totalGps);
}

function spawnOffers() {
    const list = document.getElementById('offers_list');
    list.innerHTML = "";
    const names = Object.keys(BRAINROTS);
    
    for(let i=0; i<3; i++) {
        const name = names[Math.floor(Math.random() * names.length)];
        const data = BRAINROTS[name];
        list.innerHTML += `
            <div class="offer-card">
                <b>${name}</b> - $${data.price}<br>
                <button onclick="buyTeacher('${name}', ${data.price}, ${data.gps})">ROBAR</button>
            </div>`;
    }
}

window.buyTeacher = function(name, price, gps) {
    if (state.money >= price && state.inventory.length < state.maxSlots) {
        state.money -= price;
        state.inventory.push({name, gps});
        renderBase();
        spawnOffers();
        updateUI();
    } else {
        alert("Sin dinero o slots");
    }
};

function renderBase() {
    const grid = document.getElementById('base_grid');
    grid.innerHTML = "";
    for(let i=0; i < state.maxSlots; i++) {
        const item = state.inventory[i];
        grid.innerHTML += `<div class="slot ${item ? 'occupied' : ''}">${item ? item.name : 'VACÍO'}</div>`;
    }
    document.getElementById('slot_count').innerText = `${state.inventory.length}/${state.maxSlots}`;
}

function updateUI(gps = 0) {
    document.getElementById('money').innerText = Math.floor(state.money).toLocaleString();
    document.getElementById('gps').innerText = gps;
    document.getElementById('rebirths').innerText = state.rebirthLevel;
}

init();
