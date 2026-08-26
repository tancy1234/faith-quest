const {
    startTrivia,
    expireTrivia
} = require(
    "../game/triviaManager"
);


// ============================================
// SEND BOT MESSAGE
// ============================================

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


    io.to(
        data.room
    ).emit(
        "receive_message",
        message
    );

}


// ============================================
// COMMAND
// ============================================

module.exports = {

    name:
        "trivia",


    async execute(
        socket,
        data,
        io,
        saveChatMessage,
        args
    ) {

        const uid =
            data.uid;


        // ====================================
        // GET DIFFICULTY
        // ====================================

        const parts =
            data.text
                .trim()
                .split(/\s+/);


        const difficulty =
            (
                parts[1] ||
                ""
            )
                .toLowerCase()
                .trim();


        // ====================================
        // NO DIFFICULTY
        // ====================================

        if (
            !difficulty
        ) {

            await sendBotMessage(
                io,
                data,
                saveChatMessage,
                `🧠 Trivia 答题 <br>

Usage / 用法：<br>

C#trivia easy <br>
C#trivia medium <br>
C#trivia hard <br>
C#trivia insane`
            );


            return;

        }


        // ====================================
        // START TRIVIA
        // ====================================

        const result =
            startTrivia(
                uid,
                difficulty
            );


        // ====================================
        // ERROR
        // ====================================

        if (
            !result.success
        ) {

            if (
                result.error ===
                "COOLDOWN"
            ) {

                const totalSeconds =
                    Math.ceil(
                        result.remaining /
                        1000
                    );


                const minutes =
                    Math.floor(
                        totalSeconds /
                        60
                    );


                const seconds =
                    totalSeconds %
                    60;


                await sendBotMessage(
                    io,
                    data,
                    saveChatMessage,
                    `⏳ Trivia Cooldown!

            Please wait ${minutes} minute(s) ${seconds} second(s) before trying again. <br>

            请等待 ${minutes} 分钟 ${seconds} 秒后再进行 Trivia。`
                );


                return;

            }

            if (
                result.error ===
                "INVALID_DIFFICULTY"
            ) {

                await sendBotMessage(
                    io,
                    data,
                    saveChatMessage,
                    `❌ Invalid difficulty 难度无效! <br>

Please use / 请使用：<br>

C#trivia easy <br>
C#trivia medium <br>
C#trivia hard <br>
C#trivia insane`
                );


                return;

            }


            if (
                result.error ===
                "ACTIVE_TRIVIA"
            ) {

                await sendBotMessage(
                    io,
                    data,
                    saveChatMessage,
                    `🧠 You already have an active trivia question!

你目前还有一道 Trivia 题目正在进行中。<br>

Please answer A, B, C or D. 请回答 A, B, C 或 D`
                );


                return;

            }


            await sendBotMessage(
                io,
                data,
                saveChatMessage,
                `❌ 无法开始`
            );


            return;

        }


        // ====================================
        // QUESTION
        // ====================================

        const question =
            result.question;


        const optionA =
            question.options.A;

        const optionB =
            question.options.B;

        const optionC =
            question.options.C;

        const optionD =
            question.options.D;


        const difficultyText =
            difficulty
                .charAt(0)
                .toUpperCase() +
            difficulty.slice(1);


        const questionText =
            `🧠 TRIVIA 

📚 ${question.field.en} / ${question.field.zh}
⭐ Difficulty 难度: ${difficultyText} <br><br>

❓ ${question.question.en}<br>
❓ ${question.question.zh}<br><br>

A. ${optionA.en} / ${optionA.zh} <br>
B. ${optionB.en} / ${optionB.zh}<br>
C. ${optionC.en} / ${optionC.zh}<br>
D. ${optionD.en} / ${optionD.zh}<br>

⏱️ You have 8 seconds!
请在 8 秒内回答 A / B / C / D`;


        await sendBotMessage(
            io,
            data,
            saveChatMessage,
            questionText
        );


        // ====================================
        // 8 SECOND TIMEOUT
        // ====================================

        setTimeout(
            async () => {

                const expired =
                    expireTrivia(
                        uid
                    );


                // already answered
                if (
                    !expired
                ) {

                    return;

                }


                const q =
                    expired.question;


                const correct =
                    q.answer;


                const correctOption =
                    q.options[
                        correct
                    ];


                const timeoutText =
                    `⏰ Time's up!

时间到了！<br>

✅ Correct Answer / 正确答案：<br>
${correct}. ${correctOption.en} / ${correctOption.zh} <br>

💡 Explanation / 解释：<br>
${q.explanation.en}

${q.explanation.zh}`;


                await sendBotMessage(
                    io,
                    data,
                    saveChatMessage,
                    timeoutText
                );

            },
            8000
        );

    }

};