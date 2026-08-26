const db = require("../config/firebase");

module.exports = {

    name: "daily",

    async execute(socket, data, io, saveChatMessage){

        const userRef =
            db.collection("users")
            .doc(data.uid);

        const userDoc =
            await userRef.get();

        if(!userDoc.exists){
            return;
        }

        const user = userDoc.data();

        // 24 hours
        if(
            user.lastDailyClaim &&
            Date.now() - user.lastDailyClaim < 86400000
        ){

            const remaining =
                86400000 -
                (Date.now() - user.lastDailyClaim);

            const hours =
                Math.floor(
                    remaining / 3600000
                );

            const minutes =
                Math.floor(
                    (remaining % 3600000) / 60000
                );

            const message = {

                username: "FaithBot",

                uid: "FaithBot",

                room: data.room,

                text:
`🎁 每日奖励 <br>

❌ 你已获得今日奖励

位于:

${hours}h ${minutes}后可使用`,

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

            return;
        }

        const reward = 500;

        const newPoints =
            (user.points || 0) + reward;

        await userRef.update({

            points: newPoints,

            lastDailyClaim: Date.now()

        });

        const message = {

            username: "FaithBot",

            uid: "FaithBot",

            room: data.room,

            text:
`🎁 每日奖励 <br>

👤 ${user.username} <br>

🏆 +${reward} Points <br>

Points 总数:
${newPoints}`,

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

};