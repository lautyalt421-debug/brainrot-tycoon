class BrainrotTycoon {
    constructor() {
        // Constantes Técnicas (Sección 7)
        this.START_MONEY = 25;
        this.START_SLOTS = 4;
        this.OFFER_INTERVAL = 4000;
        this.OFFER_WAIT_TIME = 6000;
        this.MAX_OFFERS = 3;
        this.PRICE_INFLATION = 1.35;

        // Estado
        this.money = this.START_MONEY;
        this.inventory = [];
        this.maxSlots = this.START_SLOTS;
        this.rebirthLevel = 0;
        this.genUpgradeLevel = 0;
        this.isAdminActive = false;
        this.adminStartTime = 0;
        this.adminDuration = 0;

        this.offers = [];
        this.database = null;
        this.rarities = null;

        this.init();
    }

    async init() {
        try {
            const [brRes, rarRes] = await Promise.all([
                fetch('data/brainrots.json'),
                fetch('data/rarities.json')
            ]);
            this.database = (await brRes.json()).brainrots;
            this.rarities = await rarRes.json();
            
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
