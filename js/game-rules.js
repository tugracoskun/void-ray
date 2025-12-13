/**
 * Void Ray - Oyun Kuralları ve Mantığı (Logic Layer)
 * GÜNCELLEME: Efsunlu Eşya Oluşturma Mantığı İyileştirildi.
 */

const GameRules = {
    _cachedTotalWeight: null,

    get LOCATIONS() { return GAME_CONFIG.LOCATIONS; },

    calculateUpgradeCost: function(baseCost, currentLevel) {
        return Math.floor(baseCost * Math.pow(GAME_CONFIG.ECONOMY.UPGRADE_COST_MULTIPLIER, currentLevel));
    },

    calculateNextLevelXp: function(currentMaxXp) {
        return Math.floor(currentMaxXp * GAME_CONFIG.ECONOMY.LEVEL_XP_MULTIPLIER);
    },

    calculateLootCount: function() {
        const distribution = GAME_CONFIG.LOOT_DISTRIBUTION;
        if (this._cachedTotalWeight === null) {
            this._cachedTotalWeight = distribution.reduce((sum, item) => sum + item.weight, 0);
        }
        let random = Math.random() * this._cachedTotalWeight;
        for (const item of distribution) {
            if (random < item.weight) return item.count;
            random -= item.weight;
        }
        return 1;
    },

    generateRandomDrop: function(rarityType) {
        // Efsanevi gezegenlerin ekipman atma şansı daha yüksek.
        let equipmentChance = 0.05; // %5 Taban şans
        
        if (rarityType.id === 'rare') equipmentChance = 0.15;
        if (rarityType.id === 'epic') equipmentChance = 0.30;
        if (rarityType.id === 'legendary') equipmentChance = 0.60;
        
        if (Math.random() < equipmentChance) {
            return this.createRandomEquipment(rarityType);
        } else {
            return this.createResource(rarityType);
        }
    },

    createResource: function(rarityType) {
        const nameList = LOOT_DB[rarityType.id] || LOOT_DB['common'];
        const name = Utils.randomChoice(nameList);
        return {
            category: 'resource',
            name: name,
            type: rarityType,
            count: 1,
            desc: "İşlenmemiş hammadde."
        };
    },

    createRandomEquipment: function(rarityType) {
        const typeKeys = Object.keys(RPG_ITEMS);
        const randomTypeKey = Utils.randomChoice(typeKeys);
        const typeDef = ITEM_TYPES[randomTypeKey.toUpperCase()];
        const nameList = RPG_ITEMS[randomTypeKey];
        const baseName = Utils.randomChoice(nameList);
        
        let plusLevel = 0;
        if (rarityType.id === 'common') plusLevel = Utils.randomInt(0, 3);
        else if (rarityType.id === 'rare') plusLevel = Utils.randomInt(2, 5);
        else if (rarityType.id === 'epic') plusLevel = Utils.randomInt(4, 7);
        else if (rarityType.id === 'legendary') plusLevel = Utils.randomInt(6, 9);
        
        const fullName = `${baseName} +${plusLevel}`;

        let bonusCount = 0;
        if (rarityType.id === 'common') bonusCount = Math.random() < 0.2 ? 1 : 0;
        else if (rarityType.id === 'rare') bonusCount = Utils.randomInt(1, 2);
        else if (rarityType.id === 'epic') bonusCount = Utils.randomInt(2, 3);
        else if (rarityType.id === 'legendary') bonusCount = Utils.randomInt(3, 5);

        const bonuses = [];
        // BONUS_TYPES'ı klonla ki orijinal dizi bozulmasın
        const availableBonuses = JSON.parse(JSON.stringify(BONUS_TYPES));
        
        for (let i = 0; i < bonusCount; i++) {
            if (availableBonuses.length === 0) break;
            
            // Ağırlıklı rastgele seçim (Weight)
            let totalWeight = availableBonuses.reduce((sum, b) => sum + b.weight, 0);
            let randomWeight = Math.random() * totalWeight;
            let selectedBonus = null;
            let selectedIndex = -1;

            for (let j = 0; j < availableBonuses.length; j++) {
                if (randomWeight < availableBonuses[j].weight) {
                    selectedBonus = availableBonuses[j];
                    selectedIndex = j;
                    break;
                }
                randomWeight -= availableBonuses[j].weight;
            }

            if (selectedBonus) {
                const val = Utils.randomInt(selectedBonus.min, selectedBonus.max);
                bonuses.push({
                    name: selectedBonus.name,
                    val: val,
                    unit: selectedBonus.unit,
                    id: selectedBonus.id
                });
                // Seçilen bonusu listeden çıkar (Aynı bonus tekrar gelmesin)
                availableBonuses.splice(selectedIndex, 1);
            }
        }

        return {
            category: 'equipment',
            name: fullName,
            baseName: baseName, 
            level: plusLevel,
            slot: typeDef.id, 
            type: rarityType, 
            stats: bonuses, 
            icon: typeDef.icon,
            desc: "Efsunlu uzay ekipmanı."
        };
    },

    calculateRadiationDamage: function(timer) {
        return 0.2 + (timer * 0.005);
    },

    calculateVoidPushForce: function(timer) {
        return 0.5 + (timer * 0.002);
    },

    calculatePlanetXp: function(type) {
        if (!type || !type.xp) return 0;
        const min = GAME_CONFIG.ECONOMY.XP_VARIANCE_MIN;
        const max = GAME_CONFIG.ECONOMY.XP_VARIANCE_MAX;
        const variance = Math.random() * (max - min) + min;
        return Math.floor(type.xp * variance);
    },

    getPlayerCapacity: function() {
        const base = GAME_CONFIG.PLAYER.BASE_CAPACITY;
        const perLevel = GAME_CONFIG.PLAYER.CAPACITY_PER_LEVEL;
        const added = (typeof playerData !== 'undefined' && playerData.upgrades) 
            ? (playerData.upgrades.playerCapacity * perLevel) 
            : 0;
        return base + added;
    },

    getEchoCapacity: function() {
        const base = GAME_CONFIG.ECHO.BASE_CAPACITY;
        const perLevel = GAME_CONFIG.ECHO.CAPACITY_PER_LEVEL;
        const added = (typeof playerData !== 'undefined' && playerData.upgrades) 
            ? (playerData.upgrades.echoCapacity * perLevel) 
            : 0;
        return base + added;
    },

    isInventoryFull: function(currentCount) {
        return currentCount >= this.getPlayerCapacity();
    },

    isInSafeZone: function(entity, nexus) {
        if (!entity || !nexus) return false;
        const dx = entity.x - nexus.x;
        const dy = entity.y - nexus.y;
        const distSq = dx*dx + dy*dy;
        const safeR = GAME_CONFIG.WORLD_GEN.SAFE_ZONE_RADIUS;
        return distSq < safeR * safeR;
    },

    canEchoMerge: function(distance) {
        return distance < GAME_CONFIG.ECHO.INTERACTION_DIST;
    },

    calculateSignalInterference: function(dist, maxRange) {
        const threshold = GAME_CONFIG.ECHO.SIGNAL_INTERFERENCE_START;
        const interferenceStart = maxRange * threshold;
        if (dist <= interferenceStart) return 0;
        if (dist >= maxRange) return 1.0;
        return (dist - interferenceStart) / (maxRange - interferenceStart);
    },

    canInteract: function(source, target, buffer = 0) {
        if (!source || !target) return false;
        const dist = Math.hypot(source.x - target.x, source.y - target.y);
        const targetRadius = target.radius || 0;
        return dist <= targetRadius + buffer;
    },

    getPlanetVisibility: function(p, player, echo) {
        let visibility = 0;
        const dPlayer = Math.hypot(player.x - p.x, player.y - p.y);
        if (dPlayer < player.scanRadius) return 2; 
        else if (dPlayer < player.radarRadius) visibility = 1; 

        if (echo) {
            const dEcho = Math.hypot(echo.x - p.x, echo.y - p.y);
            if (dEcho < echo.scanRadius) return 2; 
            else if (dEcho < echo.radarRadius) {
                if (visibility < 1) visibility = 1; 
            }
        }
        return visibility;
    }
};