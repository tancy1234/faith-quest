const {
    loadFoods,
    loadItems,
    loadBlindBoxRewards
} = require("./shopManager");


function randomReward() {

    const rewards =
        loadBlindBoxRewards();


    const random =
        Math.random() * 100;


    let current = 0;


    for (
        const reward
        of rewards
    ) {

        current +=
            reward.chance;


        if (
            random < current
        ) {

            return reward;

        }

    }


    return rewards[
        rewards.length - 1
    ];

}


function randomFood() {

    const foods =
        loadFoods();


    const index =
        Math.floor(
            Math.random() *
            foods.length
        );


    return foods[index];

}


function randomBlindBoxReward() {

    const reward =
        randomReward();


    if (
        reward.type ===
        "food"
    ) {

        const food =
            randomFood();


        return {

            type: "food",

            id:
                food.id,

            name:
                food.name,

            emoji:
                food.emoji

        };

    }


    return reward;

}


module.exports = {

    randomBlindBoxReward

};