const db=require("../config/firebase");
const {
    getLevelProgress
} = require("../game/level");

module.exports = {

    name:"profile",


    async execute(socket,data,io,saveChatMessage){

        console.log("PROFILE COMMAND RUN");


        let targetUid = data.uid;


        // Check if user wants to view another profile
        const args =
            data.text
            .trim()
            .split(/\s+/);



        if(args.length > 1){


            const username =
                args[1]
                .replace("@","")
                .toLowerCase();



            console.log(
                "Searching username:",
                username
            );


            const result =
                await db.collection("users")
                .where(
                    "usernameLower",
                    "==",
                    username
                )
                .get();



            if(result.empty){


                const message = {

                    username:"FaithBot",

                    uid:"FaithBot",

                    room:data.room,

                    text:
                    `❌ 玩家 @${username} 不存在`,

                    createdAt:Date.now()

                };


                await saveChatMessage(
                    data.room,
                    message
                );


                io.to(data.room)
                .emit(
                    "receive_message",
                    message
                );


                return;

            }



            targetUid =
                result.docs[0].id;


        }



        const user =
        await db.collection("users")
        .doc(targetUid)
        .get();



        if(user.exists){


            const profile=user.data();


            const totalCorrect = profile.totalCorrect || 0;

            const totalWrong = profile.totalWrong || 0;
            const progress =
                getLevelProgress(profile.xp);

            const accuracy =
                totalCorrect + totalWrong === 0
                ? 0
                :
                Math.round(
                    (totalCorrect /
                    (totalCorrect + totalWrong))
                    * 100
                );



            const message = {

                username:"FaithBot",

                uid:"FaithBot",

                room:data.room,

                text:
`
👤 ${profile.username} <br>

⭐ 等级: ${profile.level} <br>
✨ XP 进度: <br>

${"█".repeat(
    Math.floor(progress.percentage / 10)
)}
${"░".repeat(
    10 - Math.floor(progress.percentage / 10)
)}

${progress.currentXP} / ${progress.neededXP} XP <br>


🏆 Points: ${profile.points} <br>

📖 挑战基督问答记录 <br>

✅ 对: ${totalCorrect} <br>
❌ 错: ${totalWrong} <br>

🎯 正确值: ${accuracy}%
`,

                createdAt: Date.now()

            };



            // save to Firestore
            await saveChatMessage(
                data.room,
                message
            );


            // show immediately
            io.to(data.room).emit(
                "receive_message",
                message
            );


        }

    }

};