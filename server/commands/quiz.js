const questions = require("../data/bible_questions.json");
const activeQuiz = require("../game/quizManager");
const cooldowns = require("../game/quizCooldown");
const db = require("../config/firebase");


async function sendBotMessage(io, data, saveChatMessage, text){

    const message = {

        username:"FaithBot",

        uid:"FaithBot",

        text:text,

        room:data.room,

        createdAt:Date.now()

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

    name:"quiz",


    async execute(socket, data, io, saveChatMessage){


        const uid = data.uid;

        const now = Date.now();



        // Cooldown check
        if(cooldowns[uid]){


            const remaining =
                cooldowns[uid] - now;


            if(remaining > 0){


                const minutes =
                    Math.ceil(
                        remaining / 60000
                    );


                await sendBotMessage(
                    io,
                    data,
                    saveChatMessage,
`⏰ 你已经挑战过了！

请等待 ${minutes} 分钟后再挑战。`
                );


                return;

            }

        }



        // Prevent multiple quiz
        if(activeQuiz[data.uid]){


            await sendBotMessage(
                io,
                data,
                saveChatMessage,
                "❗你还有一题未完成。"
            );


            return;

        }



        const args =
            data.text
            .trim()
            .split(/\s+/);



        if(args.length < 2){


            await sendBotMessage(
                io,
                data,
                saveChatMessage,
`
📖 圣经问答 

请选择难度：<br>

🟢 C#quiz easy <br>

🟡 C#quiz medium <br>

🟠 C#quiz hard <br>

🔴 C#quiz insane <br>
`
            );


            return;

        }




        const difficulty =
            args[1].charAt(0).toUpperCase()
            +
            args[1].slice(1).toLowerCase();



        const filteredQuestions =
            questions.filter(
                q=>q.difficulty === difficulty
            );



        if(filteredQuestions.length === 0){


            await sendBotMessage(
                io,
                data,
                saveChatMessage,
                "❌ 找不到该难度的题目。"
            );


            return;

        }




        const randomQuestion =
            filteredQuestions[
                Math.floor(
                    Math.random()
                    *
                    filteredQuestions.length
                )
            ];



        cooldowns[uid] =
            now + (5 * 60 * 1000);




        activeQuiz[data.uid] = {


            id:
            randomQuestion.id,


            answer:
            randomQuestion.answer,


            difficulty:
            randomQuestion.difficulty
            .charAt(0)
            .toUpperCase()
            +
            randomQuestion.difficulty
            .slice(1)
            .toLowerCase()


        };





        const timer = setTimeout(async()=>{


            // Add wrong count
            const userRef =
                db.collection("users")
                .doc(data.uid);


            const userDoc =
                await userRef.get();


            if(userDoc.exists){


                const user =
                    userDoc.data();


                await userRef.update({

                    totalWrong:
                    (user.totalWrong || 0) + 1

                });


            }



            await sendBotMessage(
                io,
                data,
                saveChatMessage,
        `
        ⏰ 时间到！<br>

        正确答案：

        ${randomQuestion.answer} <br>

        ❌ 已记录为错误回答。
        `
            );


            delete activeQuiz[data.uid];


        },8000);





        activeQuiz[data.uid].timer = timer;





        await sendBotMessage(
            io,
            data,
            saveChatMessage,
`
📖 圣经问答（${randomQuestion.difficulty}）<br>

${randomQuestion.question} <br>


A. ${randomQuestion.options.A} <br>

B. ${randomQuestion.options.B} <br>

C. ${randomQuestion.options.C} <br>

D. ${randomQuestion.options.D} <br>


⏰ 请在8秒内回答 A、B、C 或 D。
`
        );


    }

};