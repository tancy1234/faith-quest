const fs = require("fs");
const path = require("path");

const foodsPath =
    path.join(__dirname, "../data/foods.json");

const comboFoodPath =
    path.join(__dirname, "../data/comboFood.json");


function loadFoods() {

    return JSON.parse(
        fs.readFileSync(
            foodsPath,
            "utf8"
        )
    );

}


function loadComboFoods() {

    return JSON.parse(
        fs.readFileSync(
            comboFoodPath,
            "utf8"
        )
    );

}


/*
========================================
GET FOOD BLESSING WEIGHT
========================================
*/

function getFoodBlessWeight(
    foodId
) {

    const foods =
        loadFoods();

    const food =
        foods.find(
            item =>
                item.id === foodId
        );


    if (!food) {

        return 0;

    }


    return Number(
        food.blessChance || 0
    );

}


/*
========================================
CHECK COMBOS
========================================
*/

function getComboBlessWeight(
    foodIds
) {

    const combos =
        loadComboFoods();


    let bonusWeight = 0;


    combos.forEach(
        combo => {

            const requiredFoods =
                combo.foods || [];


            const hasCombo =
                requiredFoods.every(
                    foodId =>
                        foodIds.includes(
                            foodId
                        )
                );


            if (hasCombo) {

                bonusWeight +=
                    Number(
                        combo.bonusChance || 0
                    );

            }

        }
    );


    return bonusWeight;

}


/*
========================================
CALCULATE DEDICATION WEIGHT
========================================
*/

function calculateBlessWeight(
    foodIds
) {

    let foodWeight = 0;


    foodIds.forEach(
        foodId => {

            foodWeight +=
                getFoodBlessWeight(
                    foodId
                );

        }
    );


    const comboWeight =
        getComboBlessWeight(
            foodIds
        );


    const totalWeight =
        foodWeight +
        comboWeight;


    return {

        foodWeight:
            foodWeight,

        comboWeight:
            comboWeight,

        totalWeight:
            totalWeight

    };

}

/*
========================================
CALCULATE BLESSING REWARD CHANCES
========================================
*/

function calculateBlessRewardChances(totalWeight) {

    totalWeight =
        Number(totalWeight) || 0;


    // ========================================
    // BELOW 100
    // ========================================

    if (totalWeight < 100) {

    const normalTotal =
        50 + 30 + 19;

    return {

        blessed: false,

        blessChance:
            totalWeight,

        starChance: 0,

        reward1Chance:
            100 * (50 / normalTotal),

        reward2Chance:
            100 * (30 / normalTotal),

        reward3Chance:
            100 * (19 / normalTotal)

    };

}


    // ========================================
    // 100 OR ABOVE
    // ========================================

    const excess =
        totalWeight - 100;


    /*
    100 weight = 1% Star
    120 weight = 21% Star
    150 weight = 51% Star
    */

    let starChance =
        1 + excess;


    if (starChance > 100) {

        starChance = 100;

    }


    const remaining =
        100 - starChance;


    /*
    Reward ratio:

    Reward 1 = 50
    Reward 2 = 30
    Reward 3 = 19

    Total = 99
    */

    const normalTotal =
        50 + 30 + 19;


    const reward1Chance =
        remaining *
        (50 / normalTotal);


    const reward2Chance =
        remaining *
        (30 / normalTotal);


    const reward3Chance =
        remaining *
        (19 / normalTotal);


    return {

        blessed: true,

        blessChance: 100,

        starChance:
            starChance,

        reward1Chance:
            reward1Chance,

        reward2Chance:
            reward2Chance,

        reward3Chance:
            reward3Chance

    };

}

function rollBlessing(
    totalWeight
) {

    const chance =
        Math.min(
            totalWeight,
            100
        );


    const roll =
        Math.random() * 100;


    return roll < chance;

}
/*
========================================
ROLL BLESSING REWARD
========================================
*/

function rollBlessingReward(
    chances
) {

    const random =
        Math.random() * 100;


    let current =
        0;


    current +=
        chances.starChance;

    if (random < current) {

        return "star";

    }


    current +=
        chances.reward1Chance;

    if (random < current) {

        return "reward1";

    }


    current +=
        chances.reward2Chance;

    if (random < current) {

        return "reward2";

    }


    return "reward3";

}

function testBlessingSystem() {

    const testWeights = [
        10,
        25,
        50,
        80,
        99,
        100,
        110,
        120,
        150,
        200
    ];


    console.log(
        "\n===== BLESSING SYSTEM TEST ====="
    );


    testWeights.forEach(
        weight => {

            const chances =
                calculateBlessRewardChances(
                    weight
                );


            console.log(
                `\nWeight: ${weight}`
            );


            console.log(
                "Bless chance:",
                Math.min(
                    weight,
                    100
                ) + "%"
            );


            console.log(
                "Star chance:",
                chances.starChance + "%"
            );


            if (weight >= 100) {

                console.log(
                    "Reward 1:",
                    chances.reward1Chance.toFixed(2) + "%"
                );

                console.log(
                    "Reward 2:",
                    chances.reward2Chance.toFixed(2) + "%"
                );

                console.log(
                    "Reward 3:",
                    chances.reward3Chance.toFixed(2) + "%"
                );


                const total =
                    chances.starChance +
                    chances.reward1Chance +
                    chances.reward2Chance +
                    chances.reward3Chance;


                console.log(
                    "Reward total:",
                    total.toFixed(2) + "%"
                );

            }

        }
    );


    console.log(
        "\n================================\n"
    );

}

function calculateFoodDedication(
    foodPurchases
) {

    const foods =
        loadFoods();

    let foodValue = 0;
    let foodWeight = 0;


    foodPurchases.forEach(
        purchase => {

            const food =
                foods.find(
                    item =>
                        item.id === purchase.id
                );


            if (!food) {

                throw new Error(
                    `Food not found: ${purchase.id}`
                );

            }


            const quantity =
                Number(
                    purchase.quantity
                );


            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                throw new Error(
                    `Invalid quantity for ${purchase.id}`
                );

            }


            /*
            ================================
            FOOD VALUE
            ================================
            */

            foodValue +=
                food.price *
                quantity;


            /*
            ================================
            BLESSING WEIGHT
            ================================
            */

            foodWeight +=
                Number(
                    food.blessChance || 0
                ) *
                quantity;

        }
    );


    return {

        foodValue:
            foodValue,

        foodWeight:
            foodWeight

    };

}

function calculateDedicationReward(
    rewardType,
    foodValue
) {

    foodValue =
        Number(foodValue) || 0;


    // ========================================
    // NORMAL — NOT BLESSED
    // ========================================

    if (rewardType === "normal") {

        return {

            points:
                Math.floor(
                    foodValue / 2
                ),

            stars:
                0

        };

    }


    // ========================================
    // STAR
    // ========================================

    if (rewardType === "star") {

        return {

            points:
                0,

            stars:
                1

        };

    }


    // ========================================
    // REWARD 1
    // Full food value + 500
    // ========================================

    if (rewardType === "reward1") {

        return {

            points:
                foodValue + 500,

            stars:
                0

        };

    }


    // ========================================
    // REWARD 2
    // Double food value + 1000
    // ========================================

    if (rewardType === "reward2") {

        return {

            points:
                (foodValue * 2) + 1000,

            stars:
                0

        };

    }


    // ========================================
    // REWARD 3
    // Triple food value + 2000
    // ========================================

    if (rewardType === "reward3") {

        return {

            points:
                (foodValue * 3) + 1500,

            stars:
                0

        };

    }


    // ========================================
    // FALLBACK
    // ========================================

    return {

        points: 0,

        stars: 0

    };

}

function calculateComboBlessWeight(
    foodPurchases
) {

    const combos =
        loadComboFoods();


    let comboWeight = 0;


    /*
    Convert purchases into:

    {
        bread: 3,
        fish: 2,
        grapes: 1
    }
    */

    const quantities = {};


    foodPurchases.forEach(
        purchase => {

            quantities[purchase.id] =
                (
                    quantities[purchase.id] ||
                    0
                ) +
                Number(
                    purchase.quantity
                );

        }
    );


    combos.forEach(
        combo => {

            const requiredFoods =
                combo.foods || [];


            /*
            Check whether every
            food required by the combo
            exists.
            */

            const canTrigger =
                requiredFoods.every(
                    foodId =>
                        (
                            quantities[foodId] ||
                            0
                        ) > 0
                );


            if (!canTrigger) {

                return;

            }


            /*
            =================================
            HOW MANY TIMES CAN THE COMBO TRIGGER?
            =================================

            Example:

            bread × 3
            fish × 2
            grapes × 1

            Combo:
            bread + fish + grapes

            Minimum quantity = 1

            → combo triggers 1 time
            */

            const triggerCount =
                Math.min(
                    ...requiredFoods.map(
                        foodId =>
                            quantities[foodId] || 0
                    )
                );


            comboWeight +=
                Number(
                    combo.bonusChance || 0
                ) *
                triggerCount;

        }
    );


    return comboWeight;

}

function testDedicationCalculation() {

    console.log(
        "\n===== DEDICATION CALCULATION TEST ====="
    );


    const testFoods = [

        {
            id: "bread",
            quantity: 3
        },

        {
            id: "egg",
            quantity: 2
        },

        {
            id: "grapes",
            quantity: 1
        }

    ];


    const testPoints = 100;


    try {

        const result =
            calculateDedication(
                testFoods,
                testPoints
            );


        console.log(
            "\nFood value:",
            result.foodValue
        );


        console.log(
            "Food weight:",
            result.foodWeight
        );


        console.log(
            "Combo weight:",
            result.comboWeight
        );


        console.log(
            "Total bless weight:",
            result.totalBlessWeight
        );


        console.log(
            "Point value:",
            result.pointValue
        );


        console.log(
            "Total dedication value:",
            result.totalDedicationValue
        );


        const blessChance =
            Math.min(
                result.totalBlessWeight,
                100
            );


        console.log(
            "Bless chance:",
            blessChance + "%"
        );


    }
    catch(error) {

        console.error(
            "DEDICATION TEST ERROR:",
            error
        );

    }


    console.log(
        "\n========================================\n"
    );

}

/*
========================================
EXPORT
========================================
*/

module.exports = {

    loadFoods,
    loadComboFoods,
    getFoodBlessWeight,
    getComboBlessWeight,
    calculateBlessWeight,
    calculateBlessRewardChances,
    rollBlessing,
    rollBlessingReward,
    calculateFoodDedication,
    calculateComboBlessWeight,
    
    testBlessingSystem,
    
    calculateDedicationReward

};