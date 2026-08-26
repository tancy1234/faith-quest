const db = require("../config/firebase");

const {
    getLevelProgress
} = require("../game/level");

async function execute(socket, data, io, saveChatMessage) {

    try {

        const senderUid = socket.uid;
        const room = data.room || "room";

        if (!senderUid) {

            socket.emit("receive_message", {
                username: "FaithBot",
                uid: "FaithBot",
                room: room,
                text: "❌ 无法识别用户.",
                createdAt: Date.now()
            });

            return;
        }


        // ========================================
        // PARSE COMMAND
        // C#give @username amount
        // ========================================

        const args = data.text
            .trim()
            .split(/\s+/);


        if (args.length !== 3) {

            socket.emit("receive_message", {
                username: "FaithBot",
                uid: "FaithBot",
                room: room,
                text:
                    "🎁 使用:\n\n <br>" +
                    "C#give @username <amount>\n\n <br>" +
                    "比如:\n <br>" +
                    "C#give @tan 100",
                createdAt: Date.now()
            });

            return;
        }


        const targetInput =
            args[1].trim();


        // Must use @username
        if (!targetInput.startsWith("@")) {

            socket.emit("receive_message", {

                username: "FaithBot",

                uid: "FaithBot",

                room: room,

                text:
                    "❌ 请加入 @username。\n\n <br>" +
                    "比如:\n <br>" +
                    "C#give @tan 100",

                createdAt: Date.now()

            });

            return;
        }


        const targetUsername =
            targetInput
                .substring(1)
                .trim();


        const amount =
            Number(args[2]);


        // ========================================
        // VALIDATE USERNAME
        // ========================================

        if (!targetUsername) {

            socket.emit("receive_message", {
                username: "FaithBot",
                uid: "FaithBot",
                room: room,
                text: "❌ 请输入用户名",
                createdAt: Date.now()
            });

            return;
        }


        // ========================================
        // VALIDATE AMOUNT
        // ========================================

        if (
            !Number.isInteger(amount) ||
            amount <= 0
        ) {

            socket.emit("receive_message", {
                username: "FaithBot",
                uid: "FaithBot",
                room: room,
                text:
                    "❌ 请输入合理的 Points.",
                createdAt: Date.now()
            });

            return;
        }


        // ========================================
        // FIND RECEIVER
        // ========================================

        const usernameLower =
            targetUsername.toLowerCase();


        const receiverSnapshot =
            await db.collection("users")
            .where(
                "usernameLower",
                "==",
                usernameLower
            )
            .limit(1)
            .get();


        if (receiverSnapshot.empty) {

            socket.emit("receive_message", {
                username: "FaithBot",
                uid: "FaithBot",
                room: room,
                text:
                    `❌ 玩家 @${targetUsername} 不存在`,
                createdAt: Date.now()
            });

            return;
        }


        const receiverDoc =
            receiverSnapshot.docs[0];


        const receiverUid =
            receiverDoc.id;


        const receiver =
            receiverDoc.data();


        // ========================================
        // CANNOT GIVE YOURSELF
        // ========================================

        if (receiverUid === senderUid) {

            socket.emit("receive_message", {
                username: "FaithBot",
                uid: "FaithBot",
                room: room,
                text:
                    "❌ 你不能指定自己.",
                createdAt: Date.now()
            });

            return;
        }


        // ========================================
        // GET SENDER
        // ========================================

        const senderRef =
            db.collection("users")
            .doc(senderUid);


        const receiverRef =
            db.collection("users")
            .doc(receiverUid);


        // ========================================
        // FIRESTORE TRANSACTION
        // ========================================

        const result =
            await db.runTransaction(
                async (transaction) => {

                    const senderDoc =
                        await transaction.get(
                            senderRef
                        );


                    const receiverDoc =
                        await transaction.get(
                            receiverRef
                        );


                    if (!senderDoc.exists) {
                        throw new Error(
                            "SENDER_NOT_FOUND"
                        );
                    }


                    if (!receiverDoc.exists) {
                        throw new Error(
                            "RECEIVER_NOT_FOUND"
                        );
                    }


                    const sender =
                        senderDoc.data();


                    const receiver =
                        receiverDoc.data();


                    const senderPoints =
                        Number(
                            sender.points || 0
                        );


                    const receiverPoints =
                        Number(
                            receiver.points || 0
                        );


                    // =================================
                    // CHECK BALANCE
                    // =================================

                    if (
                        senderPoints < amount
                    ) {

                        throw new Error(
                            "NOT_ENOUGH_POINTS"
                        );

                    }


                    const newSenderPoints =
                        senderPoints - amount;


                    const newReceiverPoints =
                        receiverPoints + amount;


                    // =================================
                    // UPDATE BOTH USERS
                    // =================================

                    transaction.update(
                        senderRef,
                        {
                            points:
                                newSenderPoints
                        }
                    );


                    transaction.update(
                        receiverRef,
                        {
                            points:
                                newReceiverPoints
                        }
                    );


                    return {

                        senderUsername:
                            sender.username,

                        receiverUsername:
                            receiver.username,

                        senderPoints:
                            newSenderPoints,

                        receiverPoints:
                            newReceiverPoints

                    };

                }
            );


        // ========================================
        // CHAT MESSAGE
        // ========================================

        const botMessage = {

            username: "FaithBot",

            uid: "FaithBot",

            room: room,

            text:
                `🎁 ${result.senderUsername} 给 ${amount} Points ${result.receiverUsername}! <br>

💰 ${result.senderUsername} Points: ${result.senderPoints} <br>
💰 ${result.receiverUsername} Points: ${result.receiverPoints} <br>`,

            createdAt: Date.now()

        };


        // ========================================
        // SAVE MESSAGE
        // ========================================

        await saveChatMessage(
            room,
            botMessage
        );


        // ========================================
        // BROADCAST TO ROOM
        // ========================================

        io.to(room).emit(
            "receive_message",
            botMessage
        );


        // ========================================
        // UPDATE SENDER PROFILE
        // ========================================

        const senderProfile =
            await db.collection("users")
            .doc(senderUid)
            .get();

        if (senderProfile.exists) {

            const user =
                senderProfile.data();

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
            `成功: ${result.senderUsername} -> ${result.receiverUsername}: ${amount} Points`
        );

    }
    catch(error) {

        console.error(
            "GIVE COMMAND ERROR:",
            error
        );


        let message =
            "❌ 给予失败";


        if (
            error.message ===
            "NOT_ENOUGH_POINTS"
        ) {

            message =
                "❌ 你没有足够的 Points.";

        }


        else if (
            error.message ===
            "SENDER_NOT_FOUND"
        ) {

            message =
                "❌ 无法寻找你的用户";

        }


        else if (
            error.message ===
            "RECEIVER_NOT_FOUND"
        ) {

            message =
                "❌ 无法获得给予对象";

        }


        socket.emit(
            "receive_message",
            {

                username:
                    "FaithBot",

                uid:
                    "FaithBot",

                room:
                    data.room || "room",

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