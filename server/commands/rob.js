const db = require("../config/firebase");

const ROB_AMOUNT = 100;
const ROB_SUCCESS_CHANCE = 50;
const ROB_COOLDOWN = 60 * 60 * 1000; // 1 hour


async function execute(
    socket,
    data,
    io,
    saveChatMessage
) {

    // Define outside try so catch can use it
    const room =
        data.room || "room";

    try {

        const robberUid =
            socket.uid;


        if (!robberUid) {

            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text: "❌ 用户无法识别",
                    createdAt: Date.now()
                }
            );

            return;
        }


        // ========================================
        // PARSE COMMAND
        // ========================================

        const args =
            data.text
                .trim()
                .split(/\s+/);


        if (args.length !== 2) {

            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text:
                        "🥷 使用:\n\n <br>" +
                        "C#rob @username\n\n <br>" +
                        "比如:\n <br>" +
                        "C#rob @tan",
                    createdAt: Date.now()
                }
            );

            return;
        }


        // ========================================
        // REQUIRE @
        // ========================================

        const targetInput =
            args[1].trim();


        if (
            !targetInput.startsWith("@")
        ) {

            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text:
                        "❌ 请用 @username.\n\n <br>" +
                        "比如:\n <br>" +
                        "C#rob @tan",
                    createdAt: Date.now()
                }
            );

            return;
        }


        const targetUsername =
            targetInput
                .substring(1)
                .trim();


        if (!targetUsername) {

            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text:
                        "❌ 请输入用户名",
                    createdAt: Date.now()
                }
            );

            return;
        }


        // ========================================
        // GET ROBBER
        // ========================================

        const robberRef =
            db.collection("users")
            .doc(robberUid);


        const robberDoc =
            await robberRef.get();


        if (!robberDoc.exists) {

            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text:
                        "❌ 无法获取用户",
                    createdAt: Date.now()
                }
            );

            return;
        }


        const robber =
            robberDoc.data();


        // ========================================
        // CHECK ROBBER POINTS
        // ========================================

        const robberPoints =
            Number(
                robber.points || 0
            );


        if (
            robberPoints < ROB_AMOUNT
        ) {

            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text:
                        `❌ 你需要至少 ${ROB_AMOUNT} Points 才能打抢`,
                    createdAt: Date.now()
                }
            );

            return;
        }


        // ========================================
        // CHECK COOLDOWN
        // ========================================

        const now =
            Date.now();


        let cooldownTime = null;


        if (robber.robCooldown) {

            if (
                typeof robber.robCooldown.toMillis ===
                "function"
            ) {

                cooldownTime =
                    robber.robCooldown.toMillis();

            }

            else if (
                robber.robCooldown instanceof Date
            ) {

                cooldownTime =
                    robber.robCooldown.getTime();

            }

            else if (
                typeof robber.robCooldown ===
                "number"
            ) {

                cooldownTime =
                    robber.robCooldown;

            }

        }


        if (
            cooldownTime &&
            now < cooldownTime
        ) {

            const remaining =
                cooldownTime - now;


            const minutes =
                Math.ceil(
                    remaining /
                    (60 * 1000)
                );


            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text:
                        `⏳ 冷却时间 ${minutes} 分${minutes === 1 ? "" : "s"} 才能使用`,
                    createdAt: Date.now()
                }
            );

            return;
        }


        // ========================================
        // FIND TARGET
        // ========================================

        const usernameLower =
            targetUsername.toLowerCase();


        const targetSnapshot =
            await db.collection("users")
            .where(
                "usernameLower",
                "==",
                usernameLower
            )
            .limit(1)
            .get();


        if (targetSnapshot.empty) {

            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text:
                        `❌ 对象 @${targetUsername} 不存在`,
                    createdAt: Date.now()
                }
            );

            return;
        }


        const targetDoc =
            targetSnapshot.docs[0];


        const targetUid =
            targetDoc.id;


        // ========================================
        // CANNOT ROB SELF
        // ========================================

        if (
            targetUid === robberUid
        ) {

            socket.emit(
                "receive_message",
                {
                    username: "FaithBot",
                    uid: "FaithBot",
                    room: room,
                    text:
                        "❌ 你不能抢自己",
                    createdAt: Date.now()
                }
            );

            return;
        }


        // ========================================
        // ROLL SUCCESS
        // ========================================

        const success =
            Math.random() * 100 <
            ROB_SUCCESS_CHANCE;


        // ========================================
        // NEW COOLDOWN
        // ========================================

        const newCooldown =
            new Date(
                now +
                ROB_COOLDOWN
            );


        // ========================================
        // TRANSACTION
        // ========================================

        const result =
            await db.runTransaction(
                async (transaction) => {

                    const currentRobberDoc =
                        await transaction.get(
                            robberRef
                        );


                    const currentTargetDoc =
                        await transaction.get(
                            targetDoc.ref
                        );


                    if (
                        !currentRobberDoc.exists
                    ) {

                        throw new Error(
                            "ROBBER_NOT_FOUND"
                        );

                    }


                    if (
                        !currentTargetDoc.exists
                    ) {

                        throw new Error(
                            "TARGET_NOT_FOUND"
                        );

                    }


                    const currentRobber =
                        currentRobberDoc.data();


                    const currentTarget =
                        currentTargetDoc.data();


                    const currentRobberPoints =
                        Number(
                            currentRobber.points || 0
                        );


                    const targetPoints =
                        Number(
                            currentTarget.points || 0
                        );


                    // =================================
                    // ROBBER MUST HAVE 100
                    // =================================

                    if (
                        currentRobberPoints <
                        ROB_AMOUNT
                    ) {

                        throw new Error(
                            "ROBBER_NOT_ENOUGH_POINTS"
                        );

                    }


                    // =================================
                    // TARGET MUST HAVE 100
                    // =================================

                    if (
                        targetPoints <
                        ROB_AMOUNT
                    ) {

                        throw new Error(
                            "TARGET_NOT_ENOUGH_POINTS"
                        );

                    }


                    // =================================
                    // FAILED ROB
                    // Robber loses 100
                    // =================================

                    if (!success) {

                        const newRobberPoints =
                            currentRobberPoints -
                            ROB_AMOUNT;


                        transaction.update(
                            robberRef,
                            {

                                points:
                                    newRobberPoints,

                                robCooldown:
                                    newCooldown

                            }
                        );


                        return {

                            success:
                                false,

                            robberUsername:
                                currentRobber.username,

                            targetUsername:
                                currentTarget.username,

                            robberPoints:
                                newRobberPoints

                        };

                    }


                    // =================================
                    // SUCCESSFUL ROB
                    // =================================

                    const newRobberPoints =
                        currentRobberPoints +
                        ROB_AMOUNT;


                    const newTargetPoints =
                        targetPoints -
                        ROB_AMOUNT;


                    transaction.update(
                        robberRef,
                        {

                            points:
                                newRobberPoints,

                            robCooldown:
                                newCooldown

                        }
                    );


                    transaction.update(
                        targetDoc.ref,
                        {

                            points:
                                newTargetPoints

                        }
                    );


                    return {

                        success:
                            true,

                        robberUsername:
                            currentRobber.username,

                        targetUsername:
                            currentTarget.username,

                        robberPoints:
                            newRobberPoints,

                        targetPoints:
                            newTargetPoints

                    };

                }
            );


        // ========================================
        // BUILD CHAT MESSAGE
        // ========================================

        let text;


        if (
            result.success
        ) {

            text =
                `🥷 ${result.robberUsername} 成功抢夺 ${ROB_AMOUNT} Points 从 ${result.targetUsername}! <br>

💰 抢得: +${ROB_AMOUNT} Points <br>
🏆 ${result.robberUsername}'s Points: ${result.robberPoints}`;

        }

        else {

            text =
                `🥷 ${result.robberUsername} 尝试抢夺 ${result.targetUsername} 但失败! <br>

💸 打抢失败 失去: -${ROB_AMOUNT} Points <br>
🏆 ${result.robberUsername}'s Points: ${result.robberPoints}`;

        }


        const botMessage = {

            username:
                "FaithBot",

            uid:
                "FaithBot",

            room:
                room,

            text:
                text,

            createdAt:
                Date.now()

        };


        // ========================================
        // SAVE CHAT
        // ========================================

        await saveChatMessage(
            room,
            botMessage
        );


        // ========================================
        // BROADCAST
        // ========================================

        io.to(room).emit(
            "receive_message",
            botMessage
        );


        // ========================================
        // REFRESH PROFILE
        // ========================================

        const profileDoc =
            await robberRef.get();


        if (profileDoc.exists) {

            const user =
                profileDoc.data();


            const {
                getLevelProgress
            } = require("../game/level");


            const progress =
                getLevelProgress(
                    user.xp || 0
                );


            socket.emit(
                "profile_data",
                {

                    username:
                        user.username,

                    level:
                        user.level || 1,

                    xp:
                        user.xp || 0,

                    stars:
                        user.stars || 0,

                    points:
                        user.points || 0,

                    totalCorrect:
                        user.totalCorrect || 0,

                    totalWrong:
                        user.totalWrong || 0,

                    progress:
                        progress

                }
            );

        }


        console.log(
            `ROB ${result.success ? "SUCCESS" : "FAILED"}:`,
            result.robberUsername,
            "->",
            result.targetUsername
        );

    }
    catch(error) {

        console.error(
            "ROB COMMAND ERROR:",
            error
        );


        let message =
            "❌ 抢夺失败";


        if (
            error.message ===
            "TARGET_NOT_ENOUGH_POINTS"
        ) {

            message =
                "❌ 该玩家 Points 不足";

        }

        else if (
            error.message ===
            "ROBBER_NOT_ENOUGH_POINTS"
        ) {

            message =
                `❌ 你需要至少 ${ROB_AMOUNT} Points 才能打抢`;

        }

        else if (
            error.message ===
            "ROBBER_NOT_FOUND"
        ) {

            message =
                "❌ 用户无法识别";

        }

        else if (
            error.message ===
            "TARGET_NOT_FOUND"
        ) {

            message =
                "❌ 对象不存在";

        }


        socket.emit(
            "receive_message",
            {

                username:
                    "FaithBot",

                uid:
                    "FaithBot",

                room:
                    room,

                text:
                    message,

                createdAt:
                    Date.now()

            }
        );

    }

}


module.exports = {
    execute
};