const db = require("../config/firebase");
const workJobs = require("../data/workJobs.json");

const COOLDOWN = 30 * 60 * 1000; // 30 minutes

async function execute(socket, data, io, saveChatMessage) {

    try {

        const uid = socket.uid;

        if (!uid) {

            socket.emit("work_error", {
                message: "❌ 用户无法识别"
            });

            return;
        }


        // =========================
        // GET USER
        // =========================

        const userRef =
            db.collection("users").doc(uid);

        const userDoc =
            await userRef.get();

        if (!userDoc.exists) {

            socket.emit("work_error", {
                message: "❌ 用户无法识别"
            });

            return;
        }

        const user = userDoc.data();


        // =========================
        // CHECK COOLDOWN
        // =========================

        const now = Date.now();

        const cooldownUntil =
            user.workCooldownUntil || 0;


        if (cooldownUntil > now) {

            const remaining =
                cooldownUntil - now;

            const minutes =
                Math.ceil(
                    remaining / 60000
                );

            const botMessage = {

                username: "FaithBot",

                uid: "FaithBot",

                room: data.room,

                text:
            `⏳ 你累了 

            请等待 ${minutes} 分钟才开始`,

                createdAt: Date.now()

            };

            await saveChatMessage(
                data.room,
                botMessage
            );

            io.to(data.room).emit(
                "receive_message",
                botMessage
            );


            return;
        }


        // =========================
        // RANDOM JOB
        // =========================

        const job =
            workJobs[
                Math.floor(
                    Math.random() *
                    workJobs.length
                )
            ];


        // =========================
        // SET COOLDOWN
        // =========================

        const newCooldown =
            now + COOLDOWN;


        await userRef.update({

            workCooldownUntil:
                newCooldown

        });


        // =========================
        // SUCCESS / FAILURE
        // =========================

        const roll =
            Math.random() * 100;

        const success =
            roll < job.successChance;


        // =========================
        // SUCCESS
        // =========================

        if (success) {

            const reward =
                Math.floor(
                    Math.random() *
                    (
                        job.maxReward -
                        job.minReward +
                        1
                    )
                ) + job.minReward;


            const newPoints =
                (user.points || 0) + reward;


            await userRef.update({

                points: newPoints

            });


            const randomMessage =
                job.successMessages[
                    Math.floor(
                        Math.random() *
                        job.successMessages.length
                    )
                ];


            const botMessage = {

                username: "FaithBot",

                uid: "FaithBot",

                room: data.room,

                text:
`💼 ${job.emoji} ${job.job} <br>

✅ ${randomMessage} <br>

🎁 奖励: +${reward} Points <br>
🏆 目前 Points这组: ${newPoints} <br>

⏳ 下一个工作30分钟后开始`,

                createdAt: Date.now()

            };


            await saveChatMessage(
                data.room,
                botMessage
            );


            io.to(data.room).emit(
                "receive_message",
                botMessage
            );


            socket.emit(
                "work_success",
                {
                    reward: reward,
                    points: newPoints,
                    cooldownUntil: newCooldown
                }
            );

        }


        // =========================
        // FAILURE
        // =========================

        else {

            const penalty =
                job.failPenalty || 0;


            const currentPoints =
                user.points || 0;


            // Don't allow negative points
            const newPoints =
                Math.max(
                    0,
                    currentPoints - penalty
                );


            const actualLoss =
                currentPoints - newPoints;


            await userRef.update({

                points: newPoints

            });


            const randomMessage =
                job.failureMessages[
                    Math.floor(
                        Math.random() *
                        job.failureMessages.length
                    )
                ];


            const botMessage = {

                username: "FaithBot",

                uid: "FaithBot",

                room: data.room,

                text:
`💼 ${job.emoji} ${job.job} 

❌ ${randomMessage} <br>

💸 失去: -${actualLoss} Points <br>
🏆 目前 Points总数: ${newPoints} <br>

⏳ 下一个工作开始于30分钟`,

                createdAt: Date.now()

            };


            await saveChatMessage(
                data.room,
                botMessage
            );


            io.to(data.room).emit(
                "receive_message",
                botMessage
            );


            socket.emit(
                "work_failed",
                {
                    penalty: actualLoss,
                    points: newPoints,
                    cooldownUntil: newCooldown
                }
            );

        }

    }

    catch(error) {

        console.error(
            "Work command error:",
            error
        );


        socket.emit(
            "work_error",
            {
                message:
                    "❌ 发生错误"
            }
        );

    }

}


module.exports = {
    execute
};