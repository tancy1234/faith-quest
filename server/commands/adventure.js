const {
    startAdventure,
    getAdventure
} = require("../game/adventureManager");

const adventureManager =
    require("../game/adventureManager");





async function sendBotMessage(
    io,
    data,
    saveChatMessage,
    text
) {

    const message = {

        username:
            "FaithBot",

        uid:
            "FaithBot",

        text:
            text,

        room:
            data.room,

        createdAt:
            Date.now()

    };


    await saveChatMessage(
        data.room,
        message
    );


    io.to(data.room).emit(
        "receive_message",
        message
    );

}



module.exports = {

    name:
        "adventure",


    async execute(
        socket,
        data,
        io,
        saveChatMessage
    ) {

        const uid =
            data.uid;


        // ====================================
        // CHECK EXISTING ADVENTURE
        // ====================================

        const active =
            getAdventure(uid);


        if (active) {

            const remaining =
                Math.max(
                    0,
                    active.endTime -
                    Date.now()
                );


            const minutes =
                Math.ceil(
                    remaining /
                    60000
                );

            console.log("minutes =", minutes);
            await sendBotMessage(
                io,
                data,
                saveChatMessage,

                `🗺️ 你已经在冒险中了！<br>

📍 地点：${active.locationName} <br>

⏳ 剩余时间：${minutes} 分钟 <br>

请等待这次冒险完成。`
            );


            return;

        }


        // ====================================
        // CHECK MAP
        // ====================================

        const db =
            require("../config/firebase");


        const userRef =
            db.collection("users")
            .doc(uid);


        const userDoc =
            await userRef.get();


        if (!userDoc.exists) {

            await sendBotMessage(
                io,
                data,
                saveChatMessage,
                "❌ 找不到你的玩家资料。"
            );

            return;

        }


        const user =
            userDoc.data();


        const inventory =
            user.inventory || {};


        const items =
            inventory.items || {};


        const mapQuantity =
            items.map || 0;

        const lensQuantity =
            items.adventure_lens || 0;

        if (mapQuantity <= 0) {

            await sendBotMessage(
                io,
                data,
                saveChatMessage,

                `❌ 你没有地图！

🗺️ 请先到商店购买地图才能进行冒险。`
            );

            return;

        }


        // ====================================
        // OPEN ADVENTURE PANEL
        // ====================================



        socket.emit(
            "open_adventure",
            {

                locations:
                    adventureManager.loadAdventureLocations(),

                durations:
                    adventureManager.loadAdventureConfig(),

                mapQuantity:
                    mapQuantity,

                lensQuantity:
                    lensQuantity

            }
        );

    }

};