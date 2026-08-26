const fs = require("fs");
const path = require("path");


const fishPath =
    path.join(
        __dirname,
        "../data/fish.json"
    );


function loadFish() {

    return JSON.parse(
        fs.readFileSync(
            fishPath,
            "utf8"
        )
    );

}


function fish() {

    const fishes =
        loadFish();


    if (
        !Array.isArray(fishes) ||
        fishes.length === 0
    ) {

        throw new Error(
            "fish.json is empty or invalid."
        );

    }


    // =========================
    // TOTAL CHANCE
    // =========================

    const totalChance =
        fishes.reduce(
            (total, item) =>
                total + Number(item.chance || 0),
            0
        );


    // =========================
    // RANDOM
    // =========================

    let random =
        Math.random() * totalChance;


    for (const item of fishes) {

        random -=
            Number(item.chance || 0);


        if (random < 0) {

            return item;

        }

    }


    // Safety fallback

    return fishes[
        fishes.length - 1
    ];

}


module.exports = {

    fish,
    loadFish

};