const { fish } =
    require("../game/fishManager");

const cooldowns =
    require("../game/fishCooldown");

const db =
    require("../config/firebase");


async function sendBotMessage(
    io,
    data,
    saveChatMessage,
    text
) {

    const message = {

        username: "FaithBot",
        uid: "FaithBot",
        text: text,
        room: data.room,
        createdAt: Date.now()

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

    name: "fish",


    async execute(
        socket,
        data,
        io,
        saveChatMessage
    ) {

        const uid =
            data.uid;

        const now =
            Date.now();


        // =========================
        // GET USER
        // =========================

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


        // =========================
        // CHECK FISHING ROD
        // =========================

        const fishingRod =
            Number(
                items.fishing_rod || 0
            );


        if (fishingRod <= 0) {

            await sendBotMessage(
                io,
                data,
                saveChatMessage,

                `❌ 你没有钓鱼竿！

🎣 请先获得钓鱼竿才能钓鱼。`
            );

            return;

        }


        // =========================
        // COOLDOWN CHECK
        // =========================

        if (cooldowns[uid]) {

            const remaining =
                cooldowns[uid] - now;


            if (remaining > 0) {

                const minutes =
                    Math.ceil(
                        remaining / 60000
                    );


                await sendBotMessage(
                    io,
                    data,
                    saveChatMessage,

                    `⏰ 你的鱼竿还没准备好！

🎣 请等待 ${minutes} 分钟后再钓鱼。`
                );

                return;

            }

        }


        // =========================
        // FISH
        // =========================

        const result =
            fish();


        // =========================
        // CHECK TRASH
        // =========================

        const isTrash =
            result.rarity === "trash";


        // =========================
        // ADD FISH TO BAG
        // =========================

        let fishInventory =
            inventory.fish || {};


        let collectionInventory =
            inventory.collection || {};

        if (!isTrash) {

            const currentQuantity =
                Number(
                    fishInventory[result.id] || 0
                );


            fishInventory[result.id] =
                currentQuantity + 1;


            // =========================
            // UNLOCK COLLECTION
            // =========================

            collectionInventory[
                result.id
            ] = true;

        }


        // =========================
        // 20% ROD BREAK
        // =========================

        const rodBreaks =
            Math.random() < 0.20;


        let remainingRods =
            fishingRod;


        if (rodBreaks) {

            remainingRods =
                fishingRod - 1;

        }


        // =========================
        // SET COOLDOWN
        // =========================

        cooldowns[uid] =
            now + (30 * 60 * 1000);


        // =========================
        // SAVE
        // =========================

        const updateData = {

            "inventory.items.fishing_rod":
                remainingRods

        };


        // Only save fish if NOT trash
        if (!isTrash) {

            updateData["inventory.fish"] =
                fishInventory;


            updateData["inventory.collection"] =
                collectionInventory;

        }


        await userRef.update(
            updateData
        );


        // =========================
        // RESULT MESSAGE
        // =========================

        let message =

`🎣 你抛出了鱼竿…… <br>

🌊 水面晃动了！<br>

🎣 你钓到了 ${result.emoji} ${result.name}！<br>

稀有度：${result.rarity}`;


        if (isTrash) {

            message +=

`

🗑️ 这东西没有任何价值。`;

        }
        else {

            message +=

`

🎒 已放入你的背包。`;

        }


        // =========================
        // ROD BREAK MESSAGE
        // =========================

        if (rodBreaks) {

            message +=

`

💥 糟糕！你的钓鱼竿坏掉了！<br>

🎣 剩余钓鱼竿：${remainingRods}`;

        }


        await sendBotMessage(
            io,
            data,
            saveChatMessage,
            message
        );

    }

};