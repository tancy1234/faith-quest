const fs = require("fs");
const path = require("path");

const db = require("../config/firebase");


// ============================================================
// FILE
// ============================================================

const birdsPath =
    path.join(
        __dirname,
        "../data/birds.json"
    );


// ============================================================
// RARITY CONFIG
// ============================================================
//
// Chance:
// fail       = 40%
// normal     = 30%
// rare       = 20%
// super rare = 9%
// feather    = 1%
//
// Hatch time:
// fail       = 1-2 hours
// normal     = 1-4 hours
// rare       = 4-10 hours
// super rare = 8-16 hours
// feather    = 24 hours
// ============================================================

const RARITY_CONFIG = {

    fail: {

        name:
            "孵化失败",

        chance:
            40,

        minHours:
            1,

        maxHours:
            2

    },

    normal: {

        name:
            "普通",

        chance:
            30,

        minHours:
            1,

        maxHours:
            4

    },

    rare: {

        name:
            "稀有",

        chance:
            20,

        minHours:
            4,

        maxHours:
            10

    },

    super_rare: {

        name:
            "超级稀有",

        chance:
            9,

        minHours:
            8,

        maxHours:
            16

    },

    feather: {

        name:
            "羽毛",

        chance:
            1,

        minHours:
            24,

        maxHours:
            24

    }

};


// ============================================================
// LOAD BIRDS
// ============================================================

function loadBirds() {

    const data =
        fs.readFileSync(
            birdsPath,
            "utf8"
        );

    const birds =
        JSON.parse(data);


    if (
        !Array.isArray(birds)
    ) {

        throw new Error(
            "INVALID_BIRDS_JSON"
        );

    }


    return birds;

}


// ============================================================
// USER REF
// ============================================================

function getUserRef(uid) {

    return db
        .collection("users")
        .doc(uid);

}


// ============================================================
// RANDOM INTEGER
// ============================================================

function randomInteger(
    min,
    max
) {

    return Math.floor(
        Math.random() *
        (
            max -
            min +
            1
        )
    ) + min;

}


// ============================================================
// ROLL RARITY
// ============================================================

function rollRarity() {

    const random =
        Math.random() * 100;


    let cumulative =
        0;


    for (
        const [rarity, config]
        of Object.entries(
            RARITY_CONFIG
        )
    ) {

        cumulative +=
            config.chance;


        if (
            random <
            cumulative
        ) {

            return rarity;

        }

    }


    // Safety fallback

    return "normal";

}


// ============================================================
// GET RARITY NAME
// ============================================================

function getRarityName(
    rarity
) {

    const config =
        RARITY_CONFIG[
            rarity
        ];


    if (!config) {

        return "未知";

    }


    return config.name;

}


// ============================================================
// GET HATCH DURATION
// ============================================================

function getHatchDuration(
    rarity
) {

    const config =
        RARITY_CONFIG[
            rarity
        ];


    if (!config) {

        throw new Error(
            "INVALID_RARITY"
        );

    }


    const hours =
        randomInteger(
            config.minHours,
            config.maxHours
        );


    return (
        hours *
        60 *
        60 *
        1000
    );

}


// ============================================================
// FORMAT DURATION
// ============================================================

function formatDuration(
    milliseconds
) {

    const totalMinutes =
        Math.ceil(
            Number(milliseconds) /
            60000
        );


    if (
        totalMinutes <= 0
    ) {

        return "0 minute(s)";

    }


    const hours =
        Math.floor(
            totalMinutes /
            60
        );


    const minutes =
        totalMinutes %
        60;


    if (
        hours === 0
    ) {

        return (
            minutes +
            " minute(s)"
        );

    }


    if (
        minutes === 0
    ) {

        return (
            hours +
            " hour(s)"
        );

    }


    return (
        hours +
        " hour(s) " +
        minutes +
        " minute(s)"
    );

}


// ============================================================
// GET BIRDS BY RARITY
// ============================================================

function getBirdsByRarity(
    rarity
) {

    const birds =
        loadBirds();


    return birds.filter(
        bird =>
            bird.rarity ===
            rarity
    );

}


// ============================================================
// GET RANDOM BIRD
// ============================================================

function getRandomBird(
    rarity
) {

    const birds =
        getBirdsByRarity(
            rarity
        );


    if (
        birds.length === 0
    ) {

        throw new Error(
            "NO_BIRDS_AVAILABLE"
        );

    }


    // Use chance field if provided.
    // Otherwise use equal random selection.

    const totalChance =
        birds.reduce(
            (
                total,
                bird
            ) =>
                total +
                Number(
                    bird.chance || 0
                ),
            0
        );


    if (
        totalChance <= 0
    ) {

        return birds[
            Math.floor(
                Math.random() *
                birds.length
            )
        ];

    }


    const random =
        Math.random() *
        totalChance;


    let cumulative =
        0;


    for (
        const bird
        of birds
    ) {

        cumulative +=
            Number(
                bird.chance || 0
            );


        if (
            random <
            cumulative
        ) {

            return bird;

        }

    }


    return birds[
        birds.length - 1
    ];

}


// ============================================================
// GET BIRD BY ID
// ============================================================

function getBirdById(
    id
) {

    const birds =
        loadBirds();


    return birds.find(
        bird =>
            bird.id ===
            id
    );

}


// ============================================================
// GET ACTIVE BIRD HATCH
//
// Firestore:
//
// users/{uid}
//      inventory
//          bird
//              active
// ============================================================

async function getActiveBirdHatch(
    uid
) {

    if (!uid) {

        return null;

    }


    const userRef =
        getUserRef(uid);


    const snap =
        await userRef.get();


    if (
        !snap.exists
    ) {

        return null;

    }


    const user =
        snap.data();


    const inventory =
        user.inventory || {};


    const birdInventory =
        inventory.bird || {};


    const active =
        birdInventory.active;


    if (!active) {

        return null;

    }


    if (
        active.status !==
        "hatching"
    ) {

        return null;

    }


    return active;

}


// ============================================================
// START BIRD HATCH
//
// Deduct:
//
// hatch_egg -1
// incubator -1
//
// Save:
//
// inventory.bird.active
// ============================================================

async function startBirdHatch(
    uid
) {

    if (!uid) {

        throw new Error(
            "NO_UID"
        );

    }


    const userRef =
        getUserRef(uid);


    const result =
        await db.runTransaction(
            async transaction => {

                // =================================================
                // READ USER
                // =================================================

                const userSnap =
                    await transaction.get(
                        userRef
                    );


                if (
                    !userSnap.exists
                ) {

                    throw new Error(
                        "USER_NOT_FOUND"
                    );

                }


                const user =
                    userSnap.data();


                // =================================================
                // INVENTORY
                // =================================================

                const inventory =
                    user.inventory || {};

                const masterCollection =
                    inventory.collection || {};


                const items =
                    inventory.items || {};


                const birdInventory =
                    inventory.bird || {};


                // =================================================
                // CHECK ACTIVE HATCH
                // =================================================

                if (
                    birdInventory.active &&
                    birdInventory.active.status ===
                    "hatching"
                ) {

                    throw new Error(
                        "BIRD_HATCH_ALREADY_ACTIVE"
                    );

                }


                // =================================================
                // CHECK HATCH EGG
                // =================================================

                const hatchEgg =
                    Number(
                        items.hatch_egg || 0
                    );


                console.log(
                    "🐣 HATCH EGG:",
                    hatchEgg
                );


                if (
                    hatchEgg <= 0
                ) {

                    throw new Error(
                        "NO_HATCH_EGG"
                    );

                }


                // =================================================
                // CHECK INCUBATOR
                // =================================================

                const incubator =
                    Number(
                        items.incubator || 0
                    );


                console.log(
                    "⏳ INCUBATOR:",
                    incubator
                );


                if (
                    incubator <= 0
                ) {

                    throw new Error(
                        "NO_INCUBATOR"
                    );

                }


                // =================================================
                // ROLL RARITY
                // =================================================

                const rarity =
                    rollRarity();


                console.log(
                    "⭐ ROLLED RARITY:",
                    rarity
                );


                // =================================================
                // GET HATCH TIME
                // =================================================

                const duration =
                    getHatchDuration(
                        rarity
                    );


                const now =
                    Date.now();


                const endTime =
                    now +
                    duration;


                console.log(
                    "⏱️ HATCH DURATION:",
                    formatDuration(
                        duration
                    )
                );


                // =================================================
                // REMOVE HATCH EGG
                // =================================================

                const newItems = {

                    ...items

                };


                if (
                    hatchEgg === 1
                ) {

                    delete newItems.hatch_egg;

                }
                else {

                    newItems.hatch_egg =
                        hatchEgg - 1;

                }


                // =================================================
                // REMOVE INCUBATOR
                // =================================================

                if (
                    incubator === 1
                ) {

                    delete newItems.incubator;

                }
                else {

                    newItems.incubator =
                        incubator - 1;

                }


                // =================================================
                // ACTIVE HATCH
                // =================================================

                const active = {

                    rarity:
                        rarity,

                    startedAt:
                        now,

                    endTime:
                        endTime,

                    duration:
                        duration,

                    status:
                        "hatching"

                };


                // =================================================
                // NEW BIRD INVENTORY
                // =================================================

                const newBirdInventory = {

                    ...birdInventory,

                    active:
                        active

                };


                // =================================================
                // NEW INVENTORY
                // =================================================

                const newInventory = {

                    ...inventory,

                    items:
                        newItems,

                    bird:
                        newBirdInventory

                };


                // =================================================
                // SAVE
                // =================================================

                transaction.update(
                    userRef,
                    {

                        inventory:
                            newInventory

                    }
                );


                return {

                    rarity:
                        rarity,

                    duration:
                        duration,

                    endTime:
                        endTime

                };

            }
        );


    return {

        success:
            true,

        rarity:
            result.rarity,

        rarityName:
            getRarityName(
                result.rarity
            ),

        duration:
            result.duration,

        durationMinutes:
            Math.ceil(
                result.duration /
                60000
            ),

        endTime:
            result.endTime

    };

}


// ============================================================
// FINISH BIRD HATCH
// ============================================================

async function finishBirdHatch(
    uid
) {

    if (!uid) {

        throw new Error(
            "NO_UID"
        );

    }


    const userRef =
        getUserRef(uid);


    const result =
        await db.runTransaction(
            async transaction => {

                // =================================================
                // READ USER
                // =================================================

                const userSnap =
                    await transaction.get(
                        userRef
                    );


                if (
                    !userSnap.exists
                ) {

                    throw new Error(
                        "USER_NOT_FOUND"
                    );

                }


                const user =
                    userSnap.data();


                // =================================================
                // INVENTORY
                // =================================================

                const inventory =
                    user.inventory || {};

                const masterCollection =
                    inventory.collection || {};



                const items =
                    inventory.items || {};


                const birdInventory =
                    inventory.bird || {};


                // =================================================
                // ACTIVE HATCH
                // =================================================

                const active =
                    birdInventory.active;


                if (!active) {

                    throw new Error(
                        "NO_ACTIVE_HATCH"
                    );

                }


                if (
                    active.status !==
                    "hatching"
                ) {

                    throw new Error(
                        "NO_ACTIVE_HATCH"
                    );

                }


                // =================================================
                // CHECK TIME
                // =================================================

                const endTime =
                    Number(
                        active.endTime
                    );


                if (
                    Date.now() <
                    endTime
                ) {

                    throw new Error(
                        "HATCH_NOT_READY"
                    );

                }


                // =================================================
                // GET RARITY
                // =================================================

                const rarity =
                    active.rarity;


                const rarityName =
                    getRarityName(
                        rarity
                    );


                // =================================================
                // GET ORIGINAL DURATION
                // =================================================

                const duration =
                    Number(
                        active.duration ||
                        (
                            Number(
                                active.endTime
                            ) -
                            Number(
                                active.startedAt
                            )
                        )
                    );


                // =================================================
                // GET REWARD
                // =================================================

                const reward =
                    getRandomBird(
                        rarity
                    );


                if (!reward) {

                    throw new Error(
                        "NO_BIRD_REWARD"
                    );

                }

                const newMasterCollection = {

                    ...masterCollection

                };

                // =================================================
                // CURRENT COLLECTION
                // =================================================

                const collection =
                    birdInventory.collection ||
                    {};


                const existing =
                    collection[
                        reward.id
                    ];


                const newCollection = {

                    ...collection

                };


                // =================================================
                // FAIL
                //
                // IMPORTANT:
                //
                // Hatch Egg is NOT returned.
                //
                // The Hatch Egg was already consumed
                // when the hatch started.
                //
                // The reward from birds.json is
                // normal Egg (egg), not Hatch Egg.
                // =================================================

                if (
                    rarity === "fail"
                ) {

                    const newFoods = {

                        ...(inventory.foods || {})

                    };


                    const currentEgg =
                        Number(
                            newFoods.egg || 0
                        );


                    newFoods.egg =
                        currentEgg + 1;


                    const newInventory = {

                        ...inventory,

                        foods:
                            newFoods,

                        bird: {

                            ...birdInventory,

                            active:
                                null

                        }

                    };


                    transaction.update(
                        userRef,
                        {

                            inventory:
                                newInventory

                        }
                    );


                    return {

                        rarity:
                            rarity,

                        rarityName:
                            rarityName,

                        reward:
                            reward,

                        duration:
                            duration,

                        failed:
                            true

                    };

                }

                // =================================================
                // PERMANENT COLLECTION UNLOCK
                // =================================================

                if (
                    rarity !== "feather"
                ) {

                    newMasterCollection[
                        reward.id
                    ] = true;

                }

                // =================================================
                // ADD BIRD / FEATHER
                // =================================================

                

                if (
                    existing
                ) {

                    newCollection[
                        reward.id
                    ] = {

                        ...existing,

                        quantity:
                            (
                                Number(
                                    existing.quantity
                                ) || 0
                            ) + 1

                    };

                }
                else {

                    newCollection[
                        reward.id
                    ] = {

                        id:
                            reward.id,

                        name:
                            reward.name,

                        emoji:
                            reward.emoji,

                        rarity:
                            reward.rarity,

                        quantity:
                            1

                    };

                }


                // =================================================
                // CLEAR ACTIVE HATCH
                // =================================================

                const newInventory = {

                    ...inventory,


                    // Permanent discovery collection
                    collection:
                        newMasterCollection,


                    // Actual birds currently owned
                    bird: {

                        ...birdInventory,

                        active:
                            null,

                        collection:
                            newCollection

                    }

                };

                // =================================================
                // SAVE
                // =================================================

                console.log(
                    "COLLECTION BEFORE SELL:",
                    inventory.collection
                );

                transaction.update(
                    userRef,
                    {

                        inventory:
                            newInventory

                    }
                );

                const checkDoc =
                    await userRef.get();

                console.log(
                    "COLLECTION AFTER SELL:",
                    checkDoc.data()
                        .inventory
                        ?.collection
                );

                return {

                    rarity:
                        rarity,

                    rarityName:
                        rarityName,

                    reward:
                        reward,

                    duration:
                        duration,

                    failed:
                        false

                };

            }
        );


    return {

        success:
            true,

        finished:
            true,

        rarity:
            result.rarity,

        rarityName:
            result.rarityName,

        reward:
            result.reward,

        duration:
            result.duration,

        failed:
            result.failed

    };

}


// ============================================================
// CLEAR ACTIVE HATCH
// ============================================================

async function clearBirdHatch(
    uid
) {

    if (!uid) {

        return;

    }


    const userRef =
        getUserRef(uid);


    await userRef.update({

        "inventory.bird.active":
            null

    });

}


// ============================================================
// GET BIRD COLLECTION
// ============================================================

async function getBirdInventory(
    uid
) {

    if (!uid) {

        return {};

    }


    const userRef =
        getUserRef(uid);


    const snap =
        await userRef.get();


    if (
        !snap.exists
    ) {

        return {};

    }


    const user =
        snap.data();


    const inventory =
        user.inventory || {};


    const birdInventory =
        inventory.bird || {};


    return (
        birdInventory.collection ||
        {}
    );

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    loadBirds,

    getBirdById,

    getRandomBird,

    getActiveBirdHatch,

    startBirdHatch,

    finishBirdHatch,

    clearBirdHatch,

    getBirdInventory,

    formatDuration,

    getRarityName,

    RARITY_CONFIG

};