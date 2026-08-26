const db =
    require("../config/firebase");


// ============================================
// ROLL TREASURE REWARD
// ============================================

function rollTreasureReward() {

    const roll =
        Math.random() *
        100;


    // 35%
    if (
        roll < 35
    ) {

        return {
            type: "points",
            amount: 200
        };

    }


    // 25%
    if (
        roll < 60
    ) {

        return {
            type: "points",
            amount: 500
        };

    }


    // 15%
    if (
        roll < 75
    ) {

        return {
            type: "item",
            id: "hatch_egg",
            name: "孵化蛋",
            emoji: "🐣",
            quantity: 1
        };

    }


    // 10%
    if (
        roll < 85
    ) {

        return {
            type: "item",
            id: "incubator",
            name: "孵化器",
            emoji: "⏲️",
            quantity: 1
        };

    }


    // 8%
    if (
        roll < 93
    ) {

        return {
            type: "item",
            id: "map",
            name: "地图",
            emoji: "🗺️",
            quantity: 1
        };

    }


    // 5%
    if (
        roll < 98
    ) {

        return {
            type: "item",
            id: "adventure_lens",
            name: "放大镜",
            emoji: "🔍",
            quantity: 1
        };

    }


    // 2%
    return {
        type: "diamond",
        name: "钻石",
        emoji: "💎",
        quantity: 1
    };

}


// ============================================
// OPEN TREASURE
// ============================================

async function openTreasure(
    uid
) {

    const userRef =
        db.collection("users")
            .doc(uid);


    return await db.runTransaction(
        async transaction => {

            const userDoc =
                await transaction.get(
                    userRef
                );


            if (
                !userDoc.exists
            ) {

                throw new Error(
                    "USER_NOT_FOUND"
                );

            }


            const user =
                userDoc.data();


            const inventory =
                user.inventory || {};


            const items = {

                ...(inventory.items || {})

            };


            const treasure =
                Number(
                    items.treasure || 0
                );


            // =================================
            // NO TREASURE
            // =================================

            if (
                treasure <= 0
            ) {

                throw new Error(
                    "NO_TREASURE"
                );

            }


            // =================================
            // CONSUME TREASURE
            // =================================

            if (
                treasure === 1
            ) {

                delete items.treasure;

            }
            else {

                items.treasure =
                    treasure - 1;

            }


            // =================================
            // REWARD
            // =================================

            const reward =
                rollTreasureReward();


            let points =
                Number(
                    user.points || 0
                );


            let diamonds =
                Number(
                    inventory.diamonds || 0
                );


            // POINTS
            if (
                reward.type === "points"
            ) {

                points +=
                    reward.amount;

            }


            // ITEM
            if (
                reward.type === "item"
            ) {

                items[
                    reward.id
                ] =
                    (
                        Number(
                            items[
                                reward.id
                            ] || 0
                        )
                    ) +
                    reward.quantity;

            }


            // DIAMOND
            if (
                reward.type === "diamond"
            ) {

                diamonds +=
                    reward.quantity;

            }


            // =================================
            // SAVE
            // =================================

            transaction.update(
                userRef,
                {

                    points:
                        points,

                    "inventory.items":
                        items,

                    "inventory.diamonds":
                        diamonds

                }
            );


            return reward;

        }
    );

}


module.exports = {

    openTreasure,

    rollTreasureReward

};