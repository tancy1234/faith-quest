const fs = require("fs");
const path = require("path");
const { FieldValue } = require("firebase-admin/firestore");
const db = require("../config/firebase");

const collectionPath =
    path.join(
        __dirname,
        "../data/adventureCollection.json"
    );

const locationsPath =
    path.join(
        __dirname,
        "../data/adventureLocations.json"
    );

const configPath =
    path.join(
        __dirname,
        "../data/adventureConfig.json"
    );

const foodsPath =
    path.join(
        __dirname,
        "../data/foods.json"
    );


// ========================================
// ACTIVE ADVENTURES
// ========================================

const activeAdventures = {};

function loadAdventureConfig() {

    return JSON.parse(
        fs.readFileSync(
            configPath,
            "utf8"
        )
    );

}
// ========================================
// LOAD JSON
// ========================================

function loadAdventureCollection() {

    return JSON.parse(
        fs.readFileSync(
            collectionPath,
            "utf8"
        )
    );

}


function loadAdventureLocations() {

    return JSON.parse(
        fs.readFileSync(
            locationsPath,
            "utf8"
        )
    );

}


function loadFoods() {

    return JSON.parse(
        fs.readFileSync(
            foodsPath,
            "utf8"
        )
    );

}


// ========================================
// GET ACTIVE ADVENTURE
// ========================================

function getAdventure(uid) {

    return activeAdventures[uid] || null;

}


// ========================================
// START ADVENTURE
// ========================================

async function startAdventure(
    uid,
    configId,
    locationId,
    useAdventureLens = false
) {

    // ------------------------------------
    // CHECK EXISTING
    // ------------------------------------

    if (activeAdventures[uid]) {

        throw new Error(
            "ADVENTURE_ALREADY_ACTIVE"
        );

    }


    // ------------------------------------
    // VALIDATE TIME
    // ------------------------------------

    const configs =
        loadAdventureConfig();

    console.log("========== ADVENTURE CONFIG DEBUG ==========");
    console.log("Received configId:", configId);
    console.log("Available configs:", configs);
    console.log("============================================");

    const config =
        configs.find(
            item =>
                item.id ===
                configId
        );

    if (!config) {

        throw new Error(
            "INVALID_DURATION"
        );

    }


    // ------------------------------------
    // FIND LOCATION
    // ------------------------------------

    const locations =
        loadAdventureLocations();


    const location =
        locations.find(
            location =>
                location.id ===
                locationId
        );


    if (!location) {

        throw new Error(
            "INVALID_LOCATION"
        );

    }


    // ------------------------------------
    // CHECK MAP
    // ------------------------------------

    const userRef =
        db.collection("users")
        .doc(uid);


    const userDoc =
        await userRef.get();


    if (!userDoc.exists) {

        throw new Error(
            "USER_NOT_FOUND"
        );

    }


    const user =
        userDoc.data();


    const inventory =
        user.inventory || {};


    const items =
        inventory.items || {};

    const adventureLensQuantity =
        items.adventure_lens || 0;

    const hasAdventureLens =
        useAdventureLens &&
        adventureLensQuantity > 0;


    const mapQuantity =
        items.map || 0;


    if (mapQuantity <= 0) {

        throw new Error(
            "NO_MAP"
        );

    }


    // ------------------------------------
    // CONSUME MAP
    // ------------------------------------

    const updateData = {

        "inventory.items.map":
            mapQuantity - 1

    };

    if (hasAdventureLens) {

        updateData[
            "inventory.items.adventure_lens"
        ] =
            adventureLensQuantity - 1;

    }

    await userRef.update(updateData);


    // ------------------------------------
    // CREATE ADVENTURE
    // ------------------------------------

    const startedAt =
        Date.now();


    const finishAt =
        startedAt +
        (config.duration * 1000);


    const adventure = {

        uid:
            uid,

        locationId:
            location.id,

        locationName:
            location.name,

        configId:
            config.id,

        duration:
            config.duration,

        durationName:
            config.name,

        rewardPower:
            config.rewardPower,

        

        adventureLens:
            hasAdventureLens,

        startedAt:
            startedAt,

        endTime:
            finishAt

    };


    // ========================================
    // SAVE ACTIVE ADVENTURE
    // ========================================

    await userRef.update({

        activeAdventure:
            adventure

    });


    // Keep in server memory too

    activeAdventures[uid] =
        adventure;


    return adventure;

}

// ========================================
// LOAD ACTIVE ADVENTURE FROM FIRESTORE
// ========================================

async function loadActiveAdventure(uid) {

    const userRef =
        db.collection("users")
        .doc(uid);

    const userDoc =
        await userRef.get();

    if (!userDoc.exists) {

        throw new Error(
            "USER_NOT_FOUND"
        );

    }

    const user =
        userDoc.data();

    const adventure =
        user.activeAdventure || null;


    if (adventure) {

        activeAdventures[uid] =
            adventure;

    }


    return adventure;
}
// ========================================
// FINISH ADVENTURE
// ========================================

async function finishAdventure(uid) {

    const userRef =
        db.collection("users").doc(uid);

    // ========================================
    // CLAIM ADVENTURE
    // ========================================

    let adventure = null;

    await db.runTransaction(
        async transaction => {

            const userDoc =
                await transaction.get(userRef);

            if (!userDoc.exists) {

                throw new Error(
                    "USER_NOT_FOUND"
                );

            }

            const user =
                userDoc.data();

            adventure =
                user.activeAdventure || null;


            if (!adventure) {

                throw new Error(
                    "NO_ACTIVE_ADVENTURE"
                );

            }


            // ========================================
            // CHECK TIME
            // ========================================

            const now =
                Date.now();

            if (
                now <
                adventure.endTime
            ) {

                throw new Error(
                    "ADVENTURE_NOT_FINISHED"
                );

            }


            // ========================================
            // REMOVE FIRST
            // ========================================

            transaction.update(
                userRef,
                {

                    activeAdventure:
                        FieldValue.delete()

                }
            );

        }
    );


    // ========================================
    // REMOVE SERVER MEMORY
    // ========================================

    delete activeAdventures[uid];


    // ========================================
    // LOCATION
    // ========================================

    const locations =
        loadAdventureLocations();


    const location =
        locations.find(
            location =>
                location.id ===
                adventure.locationId
        );


    if (!location) {

        throw new Error(
            "INVALID_LOCATION"
        );

    }


    // ========================================
    // GENERATE REWARDS
    // ========================================

    const rewards =
        generateRewards(
            adventure,
            location
        );


    // ========================================
    // GIVE REWARDS
    // ========================================

    await giveRewards(
        uid,
        rewards
    );


    // ========================================
    // RETURN RESULT
    // ========================================

    return {

        adventure:
            adventure,

        rewards:
            rewards

    };

}


// ========================================
// GENERATE REWARDS
// ========================================

// ========================================
// GENERATE REWARDS
// ========================================

function generateRewards(
    adventure,
    location
) {

    const collection =
        loadAdventureCollection();

    const foods =
        loadFoods();

    const possibleIds =
        location.collection || [];

    const possibleCollection =
        possibleIds
            .map(id =>
                collection.find(
                    item =>
                        item.id === id
                )
            )
            .filter(Boolean);

    const rewards = [];


    // ====================================
    // REWARD POWER
    // ====================================

    const rewardPower =
        adventure.rewardPower;

    const adventureLensBonus =
        adventure.adventureLens
            ? 1.05
            : 1;

    // ====================================
    // NUMBER OF ROLLS
    // ====================================

    let rolls = 1;

    if (rewardPower >= 10) {
        rolls = 2;
    }

    if (rewardPower >= 30) {
        rolls = 3;
    }

    if (rewardPower >= 50) {
        rolls = 4;
    }

    if (rewardPower >= 70) {
        rolls = 5;
    }


    // ====================================
    // EACH ROLL
    // ====================================

    for (
        let i = 0;
        i < rolls;
        i++
    ) {

        const roll =
            Math.random();


        // =================================
        // CALCULATE REWARD CHANCES
        // =================================

        /*
            rewardPower 1
                → very difficult

            rewardPower 75
                → much easier

            These values increase gradually.
        */

        const foodChance =
            (
                0.10 +
                (rewardPower * 0.003)
            ) *
            adventureLensBonus;

        const collectionChance =
            (
                0.06 +
                (rewardPower * 0.002)
            ) *
            adventureLensBonus;

        const eggChance =
            (
                0.08 +
                (rewardPower * 0.004)
            ) *
            adventureLensBonus;

        const treasureChance =
            (
                0.01 +
                (rewardPower * 0.0004)
            ) *
            adventureLensBonus;


        const foodLimit =
            foodChance;

        const collectionLimit =
            foodLimit +
            collectionChance;

        const eggLimit =
            collectionLimit +
            eggChance;

        const treasureLimit =
            eggLimit +
            treasureChance;


        // =================================
        // NOTHING
        // =================================

        if (roll >= treasureLimit) {

            rewards.push({

                type:
                    "nothing"

            });

            continue;

        }


        // =================================
        // FOOD
        // =================================

        if (roll < foodLimit) {

            const foodCandidates =
                possibleCollection.filter(
                    item =>
                        item.type === "fruit" ||
                        item.type === "vegetable"
                );


            if (
                foodCandidates.length === 0
            ) {

                rewards.push({

                    type:
                        "nothing"

                });

                continue;

            }


            const selected =
                foodCandidates[
                    Math.floor(
                        Math.random() *
                        foodCandidates.length
                    )
                ];


            const food =
                foods.find(
                    food =>
                        food.id ===
                        selected.id
                );


            if (food) {

                rewards.push({

                    type:
                        "food",

                    id:
                        food.id,

                    name:
                        food.name,

                    emoji:
                        food.emoji,

                    quantity:
                        1

                });

            }
            else {

                rewards.push({

                    type:
                        "nothing"

                });

            }

            continue;

        }


        // =================================
        // COLLECTION
        // =================================

        if (roll < collectionLimit) {

            const collectionCandidates =
                possibleCollection.filter(
                    item =>
                        item.type !== "fruit" &&
                        item.type !== "vegetable"
                );


            if (
                collectionCandidates.length === 0
            ) {

                rewards.push({

                    type:
                        "nothing"

                });

                continue;

            }


            const selected =
                collectionCandidates[
                    Math.floor(
                        Math.random() *
                        collectionCandidates.length
                    )
                ];


            rewards.push({

                type:
                    "collection",

                id:
                    selected.id,

                name:
                    selected.name,

                emoji:
                    selected.emoji,

                collectionType:
                    selected.type

            });

            continue;

        }


        // =================================
        // HATCH EGG
        // =================================

        if (roll < eggLimit) {

            rewards.push({

                type:
                    "hatch_egg",

                quantity:
                    1

            });

            continue;

        }


        // =================================
        // TREASURE
        // =================================

        if (roll < treasureLimit) {

            rewards.push({

                type:
                    "treasure",

                quantity:
                    1

            });

            continue;

        }

    }


    return rewards;
}


// ========================================
// GIVE REWARDS
// ========================================

async function giveRewards(
    uid,
    rewards
) {

    console.log("====================================");
    console.log("🎁 GIVE REWARDS CALLED");
    console.log("UID:", uid);
    console.log("REWARDS:", rewards);
    console.log("====================================");

    
    

    const userRef =
        db.collection("users")
        .doc(uid);


    await db.runTransaction(
        async transaction => {

            const userDoc =
                await transaction.get(
                    userRef
                );


            if (!userDoc.exists) {

                throw new Error(
                    "USER_NOT_FOUND"
                );

            }


            const user =
                userDoc.data();

            console.log("📦 ITEMS BEFORE REWARD:", user.inventory?.items);          

            const inventory =
                user.inventory || {};

            let points =
                user.points || 0;


            const foods =
                {
                    ...(inventory.foods || {})
                };


            const items =
                {
                    ...(inventory.items || {})
                };


            const collection =
                {
                    ...(inventory.collection || {})
                };


            for (
                const reward of rewards
            ) {

                // -------------------------
                // FOOD
                // -------------------------

                if (
                    reward.type ===
                    "food"
                ) {

                    // =========================
                    // ADD TO FOOD INVENTORY
                    // =========================

                    foods[reward.id] =
                        (
                            foods[reward.id] ||
                            0
                        ) +
                        reward.quantity;


                    // =========================
                    // PERMANENT COLLECTION
                    // =========================

                    collection[
                        reward.id
                    ] = true;

                }


                // -------------------------
                // COLLECTION
                // -------------------------

                if (
                    reward.type ===
                    "collection"
                ) {

                    const alreadyOwned =
                        collection[reward.id] === true;


                    // =========================
                    // NEW COLLECTION ITEM
                    // =========================

                    if (!alreadyOwned) {

                        collection[
                            reward.id
                        ] = true;

                        console.log(
                            "🆕 NEW COLLECTION:",
                            reward.id
                        );

                    }


                    // =========================
                    // DUPLICATE
                    // =========================

                    else {

                        const duplicateTypes = [
                            "animal",
                            "bug",
                            "leaf",
                            "plant"
                        ];


                        if (
                            duplicateTypes.includes(
                                reward.collectionType
                            )
                        ) {

                            points += 100;

                            console.log(
                                "🔁 DUPLICATE:",
                                reward.id
                            );

                            console.log(
                                "💰 +100 POINTS"
                            );

                        }
                        else {

                            console.log(
                                "🔁 DUPLICATE:",
                                reward.id
                            );

                            console.log(
                                "ℹ️ NO BONUS"
                            );

                        }

                    }

                }


                // -------------------------
                // EGG
                // -------------------------

                if (
                    reward.type ===
                    "hatch_egg"
                ) {

                    items.hatch_egg =
                        (
                            items.hatch_egg ||
                            0
                        ) +
                        reward.quantity;

                }


                // -------------------------
                // TREASURE
                // -------------------------

                if (
                    reward.type ===
                    "treasure"
                ) {

                    items.treasure =
                        (
                            items.treasure ||
                            0
                        ) +
                        reward.quantity;

                }

            }
            console.log("📦 ITEMS AFTER REWARD:", items);

            transaction.update(
                userRef,
                {
                    "points":
                        points,

                    "inventory.foods":
                        foods,

                    "inventory.items":
                        items,

                    "inventory.collection":
                        collection

                }
            );

        }
    );

}


// ========================================
// EXPORT
// ========================================

module.exports = {

    startAdventure,
    finishAdventure,
    getAdventure,
    loadActiveAdventure,

    loadAdventureLocations,
    loadAdventureCollection,
    loadAdventureConfig

};