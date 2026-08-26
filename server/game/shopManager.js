const fs = require("fs");
const path = require("path");

const db = require("../config/firebase");

const foodsPath =
    path.join(__dirname, "../data/foods.json");

const itemsPath =
    path.join(__dirname, "../data/items.json");

const blindBoxRewardsPath =
    path.join(
        __dirname,
        "../data/blindBoxRewards.json"
    );


function loadBlindBoxRewards() {

    return JSON.parse(
        fs.readFileSync(
            blindBoxRewardsPath,
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


function loadItems() {

    return JSON.parse(
        fs.readFileSync(
            itemsPath,
            "utf8"
        )
    );

}


function getTodayDate() {

    const now = new Date();

    return now.toLocaleDateString(
        "en-CA",
        {
            timeZone: "Asia/Kuala_Lumpur"
        }
    );

}


function shuffle(array) {

    return [...array].sort(
        () => Math.random() - 0.5
    );

}


async function getDailySpecialFoods() {

    const today =
        getTodayDate();


    const specialRef =
        db.collection("shop")
        .doc("dailySpecial");


    const specialDoc =
        await specialRef.get();


    // =========================
    // EXISTING TODAY'S SPECIAL
    // =========================

    if (specialDoc.exists) {

        const data =
            specialDoc.data();


        if (
            data.date === today &&
            Array.isArray(data.foodIds) &&
            data.foodIds.length === 5
        ) {

            const foods =
                loadFoods();


            return foods.filter(
                food =>
                    data.foodIds.includes(
                        food.id
                    )
            );

        }

    }


    // =========================
    // NEW DAY
    // =========================

    const foods =
        loadFoods();


    if (foods.length < 5) {

        throw new Error(
            "foods.json must contain at least 5 foods."
        );

    }


    const selected =
        shuffle(foods)
        .slice(0, 5);


    const foodIds =
        selected.map(
            food => food.id
        );


    await specialRef.set({

        date: today,

        foodIds: foodIds,

        updatedAt: new Date()

    });


    console.log(
        "New Today's Special:",
        foodIds
    );


    return selected;

}


async function getShopData() {

    const foods =
        await getDailySpecialFoods();


    const items =
        loadItems();


    return {

        date:
            getTodayDate(),


        foods:
            foods.map(food => ({

                id:
                    food.id,

                name:
                    food.name,

                emoji:
                    food.emoji,

                price:
                    food.price

            })),


        items:
            items
            .filter(
                item =>
                    item.buyable
            )
            .map(item => ({

                id:
                    item.id,

                name:
                    item.name,

                emoji:
                    item.emoji,

                price:
                    item.price

            })),


        blindBox: {

            id:
                "blind_box",

            name:
                "盲盒",

            emoji:
                "🎁",

            price:
                100

        }

    };

}


module.exports = {

    getShopData,
    loadFoods,
    loadItems,
    loadBlindBoxRewards

};