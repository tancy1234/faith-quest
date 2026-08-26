const {
    createMathGame,
    getMathGame,
    answerCalculate,
    answerMemorize,
    answerGuess,
    answerQuiz,
    expireMathGame
} = require("../game/mathGameManager");

// ============================================
// HELP
// ============================================

function handleMathTimeout(userId) {

    return expireMathGame(userId);

}

function mathHelp() {

    return `
🧮 C#Math

适用玩法: <br>

C#math calculate <difficulty> <br>
C#math memorize <difficulty> <br>
C#math quiz <difficulty> <br> <br>

Difficulty: <br>
easy <br>
medium <br>
hard <br> <br>


简短cmd: <br>

C#math c easy <br>
C#math mem medium <br>
C#math q hard
`.trim();
}


// ============================================
// GAME DETECTION
// ============================================

function getGame(input) {

    if (!input) {
        return null;
    }

    const value =
        input.toLowerCase();

    const games = [
        {
            name: "calculate",
            prefixes: [
                "c",
                "ca",
                "cal",
                "calc",
                "calcu",
                "calcul",
                "calculate"
            ]
        },

        {
            name: "memorize",
            prefixes: [
                "m",
                "me",
                "mem",
                "memo",
                "memor",
                "memori",
                "memorize"
            ]
        },
        {
            name: "quiz",

            prefixes: [
                "q",
                "qu",
                "qui",
                "quiz"
            ]
        },
        
    ];

    for (const game of games) {

        if (
            game.prefixes.includes(value)
        ) {
            return game.name;
        }
    }

    return null;
}


// ============================================
// DIFFICULTY
// ============================================

function getDifficulty(input) {

    if (!input) {
        return null;
    }

    const value =
        input.toLowerCase();

    const difficulties = [
        "easy",
        "medium",
        "hard"
        
    ];

    return difficulties.find(
        difficulty =>
            difficulty.startsWith(value)
    );
}


// ============================================
// FORMAT GAME
// ============================================

function formatGame(game,language = "zh") {

    const {
        type,
        difficulty
    } = game;


    // ========================================
    // CALCULATE
    // ========================================

    if (
        type === "calculate"
    ) {

        return `
🧮 Calculate （计算） — ${capitalize(difficulty)} <br>

算出:

${game.question} <br>

⏱️ 你有5秒倒计时!
`.trim();
    }


    // ========================================
    // MEMORIZE
    // ========================================

    if (
        type === "memorize"
    ) {

        return `
🧠 Memorize （背法）— ${capitalize(difficulty)} <br>

请记住这组数列: <br>

${game.sequence.join(" ")}

⏳ 打出答案!
`.trim();
    }

    // ========================================
    // QUIZ
    // ========================================

    if (type === "quiz") {

        const lang =
            language === "en"
                ? "en"
                : "zh";

        return `
    🧮 Math Quiz （常识题）— ${capitalize(difficulty)} <br>

    ${game.question[lang]} <br>

    A. ${game.options.A[lang]} <br>
    B. ${game.options.B[lang]} <br>
    C. ${game.options.C[lang]} <br>
    D. ${game.options.D[lang]} <br>

    ⏱️ ${lang === "en"
            ? "You have 12 seconds!"
            : "你有 12 秒时间！"}
    `.trim();

    }
    

    return "❌ 错误cmd";
}


// ============================================
// CAPITALIZE
// ============================================

function capitalize(text) {

    return text.charAt(0).toUpperCase() +
        text.slice(1);
}


// ============================================
// START MATH
// ============================================

function mathCommand(
    userId,
    args
) {

    if (
        !args ||
        args.length === 0
    ) {
        return {
            type: "message",
            message: mathHelp()
        };
    }


    const command =
        args[0].toLowerCase();


    // ========================================
    // HELP
    // ========================================

    if (
        command === "help" ||
        command === "h"
    ) {

        return {
            type: "message",
            message: mathHelp()
        };
    }


    // ========================================
    // GAME
    // ========================================

    const game =
        getGame(command);


    if (!game) {

        return {
            type: "message",

            message:
                "❌ 错误 C#math cmd.\n\n" +
                mathHelp()
        };
    }


    // ========================================
    // DIFFICULTY
    // ========================================

    const difficulty =
        getDifficulty(args[1]);

    // ========================================
    // LANGUAGE
    // ========================================

    let language = "zh";

    if (args[2]) {

        const inputLanguage =
            args[2].toLowerCase();

        if (
            inputLanguage === "en" ||
            inputLanguage === "ch"
        ) {

            language =
                inputLanguage === "en"
                    ? "en"
                    : "zh";

        }

    }

    if (!difficulty) {

        return {
            type: "message",

            message:
                "❌ 不支持该难度.\n\n <br>" +
                "Available:\n <br>" +
                "easy\n <br>" +
                "medium\n <br>" +
                "hard\n <br>" +
                "insane"
        };
    }


    // ========================================
    // CREATE GAME
    // ========================================

    const result =
        createMathGame(
            userId,
            game,
            difficulty,
            language
        );


    if (!result.success) {

        return {
            type: "message",
            message: result.message
        };
    }


    // ========================================
    // RETURN GAME
    // ========================================

    return {
        type: "math_game",

        gameType: game,

        difficulty,

        language,

        game:
            result.game,

        message:
            formatGame(
                result.generated,
                language
            )
    };
}


// ============================================
// HANDLE ANSWER
// ============================================

function handleMathAnswer(
    userId,
    answer
) {

    const game =
        getMathGame(userId);


    if (!game) {

        return null;
    }


    // ========================================
    // CALCULATE
    // ========================================

    if (
        game.type === "calculate"
    ) {

        return answerCalculate(
            userId,
            answer
        );
    }


    // ========================================
    // MEMORIZE
    // ========================================

    if (
        game.type === "memorize"
    ) {

        return answerMemorize(
            userId,
            answer
        );
    }


    if (
        game.type === "quiz"
    ) {

        return answerQuiz(
            userId,
            answer
        );

    }


    return null;
}

function formatMathResult(result) {

    if (!result) {
        return null;
    }


    // ========================================
    // ERROR / INFORMATION
    // ========================================

    if (
        result.message &&
        !result.correct &&
        !result.expired &&
        result.finished === undefined
    ) {

        return result.message;

    }


    // ========================================
    // TIMEOUT
    // ========================================

    if (result.expired) {

        return result.message;

    }


    // ========================================
    // CORRECT
    // ========================================

    if (result.correct) {

        if (result.explanation) {

            const lang =
                result.language === "en"
                    ? "en"
                    : "zh";

            return `
    🎉 ${lang === "en"
                ? "Correct!"
                : "回答正确！"} <br>

    💡 ${lang === "en"
                ? "Explanation:"
                : "解释："}

    ${result.explanation[lang]}
    `.trim();

        }

        return `
    🎉 对了!  🧮
    `.trim();
    }


    // ========================================
    // WRONG
    // ========================================

    if (result.correct === false) {

        if (result.explanation) {

            const lang =
                result.language === "en"
                    ? "en"
                    : "zh";

            return `
    ❌ ${lang === "en"
                ? "Wrong!"
                : "回答错误！"} <br>

    ${lang === "en"
                ? "The correct answer was:"
                : "正确答案是："} 

    ${result.answer} <br>

    💡 ${lang === "en"
                ? "Explanation:"
                : "解释："}

    ${result.explanation[lang]}
    `.trim();
        }

        return `
    ❌ 错!

    答案是:
    ${result.answer}
    `.trim();
    }


    return null;
}


module.exports = {
    mathCommand,
    handleMathAnswer,
    handleMathTimeout,
    formatMathResult
};