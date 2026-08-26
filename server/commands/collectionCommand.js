const {
    getFirestore
} = require(
    "firebase-admin/firestore"
);


const fs =
    require("fs");


const path =
    require("path");


const db =
    getFirestore();


// ============================================
// COLLECTION PATH
// ============================================

const collectionPath =
    path.join(
        __dirname,
        "../data/adventureCollection.json"
    );


const fishPath =
    path.join(
        __dirname,
        "../data/fish.json"
    );


const birdPath =
    path.join(
        __dirname,
        "../data/birds.json"
    );
// ============================================
// LOAD COLLECTION
// ============================================

function loadAdventureCollection() {

    return JSON.parse(
        fs.readFileSync(
            collectionPath,
            "utf8"
        )
    );

}


function loadFish() {

    return JSON.parse(
        fs.readFileSync(
            fishPath,
            "utf8"
        )
    );

}


function loadBirds() {

    return JSON.parse(
        fs.readFileSync(
            birdPath,
            "utf8"
        )
    );

}


// ============================================
// COLLECTION COMMAND
// ============================================

module.exports = {

    name:
        "collection",


    async execute(
        socket,
        data,
        io,
        saveChatMessage
    ) {

        try {

            const uid =
                data.uid;


            if (!uid) {

                throw new Error(
                    "NO_UID"
                );

            }


            // ====================================
            // GET USER
            // ====================================

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


            // ====================================
            // PLAYER COLLECTION
            // ====================================

            const ownedCollection =
                user.inventory?.collection || {};

            const ownedFoods =
                user.inventory?.foods || {};

            const ownedFish =
                user.inventory?.fish || {};

            const ownedBirds =
                user.inventory?.bird?.collection || {};

            
            
            // ====================================
            // ADVENTURE COLLECTION
            // ====================================

            const collectionList =
                loadAdventureCollection();


            const collectionResult =
                collectionList.map(
                    item => {

                        let owned =
                            ownedCollection[
                                item.id
                            ] === true;


                        if (
                            !owned &&
                            (
                                item.type === "fruit" ||
                                item.type === "vegetable"
                            )
                        ) {

                            owned =
                                Number(
                                    ownedFoods[
                                        item.id
                                    ] || 0
                                ) > 0;

                        }


                        return {

                            id:
                                item.id,

                            name:
                                item.name,

                            emoji:
                                item.emoji,

                            category:
                                item.type,

                            owned:
                                owned

                        };

                    }
                );


            // ====================================
            // FISH
            // ====================================

            const fishList =
                loadFish();


            const fishResult =
                fishList
                    .filter(
                        fish =>
                            fish.rarity !== "trash" &&
                            fish.rarity !== "pearl"
                    )
                    .map(
                        fish => {

                            return {

                                id:
                                    fish.id,

                                name:
                                    fish.name,

                                emoji:
                                    fish.emoji,

                                category:
                                    "fish",

                                owned:
                                    ownedCollection[
                                        fish.id
                                    ] === true ||
                                    (
                                        Number(
                                            ownedFish[
                                                fish.id
                                            ] || 0
                                        ) > 0
                                    )

                            };

                        }
                    );


            // ====================================
            // BIRDS
            // ====================================

            const birdList =
                loadBirds();


            const birdResult =
                birdList
                    .filter(
                        bird =>
                            bird.rarity !== "feather"
                    )
                    .map(
                        bird => {

                            return {

                                id:
                                    bird.id,

                                name:
                                    bird.name,

                                emoji:
                                    bird.emoji,

                                category:
                                    "bird",

                                owned:
                                    ownedCollection[
                                        bird.id
                                    ] === true ||
                                    (
                                        Number(
                                            ownedBirds[
                                                bird.id
                                            ]?.quantity || 0
                                        ) > 0
                                    )

                            };

                        }
                    );


            // ====================================
            // COMBINE
            // ====================================

            const result = [

                ...collectionResult,

                ...fishResult,

                ...birdResult

            ];


            // ====================================
            // OPEN COLLECTION FOR THIS USER
            // ====================================

            socket.emit(
                "show_collection",
                {

                    collection:
                        result

                }
            );

        }
        catch (error) {

            console.error(
                "COLLECTION COMMAND ERROR:",
                error
            );

        }

    }

};