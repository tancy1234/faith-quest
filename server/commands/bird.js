const {
    startBirdHatch,
    finishBirdHatch,
    getActiveBirdHatch,
    formatDuration,
    getRarityName
} = require("../game/birdManager");


async function execute(
    socket,
    data,
    io,
    saveChatMessage
) {

    try {

        console.log(
            "🐦 BIRD COMMAND UID:",
            data.uid
        );


        // ====================================================
        // CHECK UID
        // ====================================================

        if (!data.uid) {

            throw new Error(
                "BIRD_NO_UID"
            );

        }


        // ====================================================
        // CHECK ACTIVE HATCH
        // ====================================================

        const activeHatch =
            await getActiveBirdHatch(
                data.uid
            );


        // ====================================================
        // ACTIVE HATCH EXISTS
        // ====================================================

        if (activeHatch) {

            const remainingMs =
                Number(
                    activeHatch.endTime
                ) -
                Date.now();


            // =================================================
            // STILL HATCHING
            // =================================================

            if (
                remainingMs > 0
            ) {

                const rarityName =
                    getRarityName(
                        activeHatch.rarity
                    );


                const message = {

                    username:
                        "FaithBot",

                    uid:
                        "FaithBot",

                    text:
                        `🥚 你的鸟蛋正在孵化中！\n\n` +
                        `⭐ 稀有度：${rarityName}\n` +
                        `⏳ 剩余时间：${formatDuration(remainingMs)}\n\n` +
                        `孵化完成后再回来查看结果！`,

                    room:
                        data.room,

                    createdAt:
                        Date.now()

                };


                socket.emit(
                    "receive_message",
                    message
                );


                return;

            }


            // =================================================
            // FINISH HATCH
            // =================================================

            const result =
                await finishBirdHatch(
                    data.uid
                );


            if (
                !result.success
            ) {

                throw new Error(
                    "BIRD_HATCH_FAILED"
                );

            }


            const reward =
                result.reward;


            const rarityName =
                result.rarityName ||
                getRarityName(
                    result.rarity
                );


            const hatchDuration =
                formatDuration(
                    result.duration
                );


            // =================================================
            // HATCH RESULT
            // =================================================

            let text;


            // =================================================
            // FAIL
            // =================================================

            if (
                result.failed
            ) {

                text =
                    `🐣 孵化完成！\n\n` +
                    `${reward.emoji} ${reward.name}\n <br>` +
                    `⭐ 稀有度：${rarityName}\n\n` +
                    `⏱️ 孵化时间：${hatchDuration}\n` +
                    `🥚 你获得了 1 个普通鸡蛋。`;

            }


            // =================================================
            // FEATHER
            // =================================================

            else if (
                result.rarity ===
                "feather"
            ) {

                text =
                    `✨ 孵化完成！\n\n` +
                    `${reward.emoji} ${reward.name}\n <br>` +
                    `⭐ 稀有度：${rarityName}\n\n` +
                    `⏱️ 孵化时间：${hatchDuration}\n` +
                    `🪶 已加入你的鸟类收藏！`;

            }


            // =================================================
            // NORMAL / RARE / SUPER RARE
            // =================================================

            else {

                text =
                    `🎉 孵化完成！\n\n` +
                    `${reward.emoji} ${reward.name}\n <br>` +
                    `⭐ 稀有度：${rarityName}\n\n` +
                    `⏱️ 孵化时间：${hatchDuration}\n` +
                    `🐦 已加入你的鸟类收藏！`;

            }


            // =================================================
            // MESSAGE
            // =================================================

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
                    Date.now(),

                birdHatch:
                    true

            };


            // =================================================
            // SAVE
            // =================================================

            await saveChatMessage(
                data.room,
                message
            );


            // =================================================
            // SEND
            // =================================================

            io.to(
                data.room
            ).emit(
                "receive_message",
                message
            );


            return;

        }


        // ====================================================
        // START NEW HATCH
        // ====================================================

        const result =
            await startBirdHatch(
                data.uid
            );

        if (!result || !result.success) {

            throw new Error(
                "BIRD_HATCH_FAILED"
            );

        }


        const rarityName =
            result.rarityName ||
            getRarityName(
                result.rarity
            );


        // ====================================================
        // START MESSAGE
        // ====================================================

        const message = {

            username:
                "FaithBot",

            uid:
                "FaithBot",

            text:
                `🐣 鸟蛋孵化开始！\n\n <br>` +
                
                `⏲️ 孵化时间：${formatDuration(result.duration)}\n\n` +
                `🥚 已使用 1 个 Hatch Egg\n` +
                `⏳ 已使用 1 个 Incubator\n\n` +
                `孵化完成后再回来查看结果！`,

            room:
                data.room,

            createdAt:
                Date.now(),

            birdHatch:
                true,

            birdHatchFinishAt:
                result.endTime

        };


        // ====================================================
        // SAVE
        // ====================================================

        await saveChatMessage(
            data.room,
            message
        );


        // ====================================================
        // SEND
        // ====================================================

        io.to(
            data.room
        ).emit(
            "receive_message",
            message
        );

    }

    catch (error) {

        console.error(
            "BIRD COMMAND ERROR:",
            error
        );


        let text;


        switch (
            error.message
        ) {

            case "USER_NOT_FOUND":

                text =
                    "❌ 用户无法识别.";

                break;


            case "NO_HATCH_EGG":

                text =
                    "🥚 你并没有孵化蛋\n\n" +
                    "可从 C#adventure获得";

                break;


            case "NO_INCUBATOR":

                text =
                    "⏳ 请购买孵化器";

                break;


            case "BIRD_HATCH_ALREADY_ACTIVE":

                text =
                    "🥚 孵化当中";

                break;


            case "NO_ACTIVE_HATCH":

                text =
                    "🥚 并不处于孵化状态";

                break;


            case "HATCH_NOT_READY":

                text =
                    "🥚 正在孵化";

                break;


            case "NO_BIRDS_AVAILABLE":

                text =
                    "❌ 此稀有度并没有鸟类";

                break;


            case "NO_BIRD_REWARD":

                text =
                    "❌ 无法生成奖励";

                break;


            case "BIRD_HATCH_FAILED":

                text =
                    "❌ 孵化失败";

                break;


            case "BIRD_NO_UID":

                text =
                    "❌ 无法识别用户";

                break;


            default:

                text =
                    "❌ 发生错误.";

                break;

        }


        socket.emit(
            "receive_message",
            {

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

            }
        );

    }

}


module.exports = {
    execute
};