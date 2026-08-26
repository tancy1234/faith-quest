const {
    generateCalculate,
    generateMemorize,
    generateGuess,
    generateQuiz
} = require("./mathManager");

// ============================================
// ACTIVE MATH GAMES
// ============================================

const activeGames = new Map();


// ============================================
// CREATE GAME
// ============================================

function createMathGame(
    userId,
    gameType,
    difficulty,
    language = "zh"
) {

    if (activeGames.has(userId)) {
        return {
            success: false,
            message:
                "⚠️ 你已经开始了"
        };
    }


    let game;


    if (gameType === "calculate") {

        game =
            generateCalculate(difficulty);

    } else if (gameType === "memorize") {

        game =
            generateMemorize(difficulty);

    } else if (gameType === "quiz") {

        game =
            generateQuiz(difficulty,language);

    } else {

        return {
            success: false,
            message:
                "❌ 游戏无效"
        };
    }


    if (!game) {

        return {
            success: false,
            message:
                "❌ 难度无效"
        };
    }


    const now = Date.now();


    const activeGame = {

        userId,

        type:
            game.type,

        difficulty:
            game.difficulty,

        answer:
            game.answer,

        createdAt:
            now,

        completed: false,
        timer: null
    };


    // ========================================
    // CALCULATE
    // ========================================

    if (gameType === "calculate") {

        activeGame.expiresAt =
            now + 5000;
    }

    
    // ========================================
    // MEMORIZE
    // ========================================

    if (gameType === "memorize") {

        activeGame.sequence =
            game.sequence;

        activeGame.showTime =
            3000;

        activeGame.answerStartedAt =
            now + 3000;

        activeGame.expiresAt =
            now + 3000 + 10000;
    }


    // ========================================
    // QUIZ
    // ========================================

    if (gameType === "quiz") {

        activeGame.language =
            language;

        activeGame.quizId =
            game.id;

        activeGame.field =
            game.field;

        activeGame.question =
            game.question;

        activeGame.options =
            game.options;

        activeGame.explanation =
            game.explanation;

    }


    activeGames.set(
        userId,
        activeGame
    );


    return {
        success: true,

        game:
            activeGame,

        generated:
            game
    };
}


// ============================================
// GET GAME
// ============================================

function getMathGame(userId) {

    return activeGames.get(userId);
}


// ============================================
// REMOVE GAME
// ============================================

function removeMathGame(userId) {

    activeGames.delete(userId);
}


// ============================================
// CALCULATE ANSWER
// ============================================

function answerCalculate(
    userId,
    answer
) {

    const game =
        activeGames.get(userId);


    if (!game) {

        return {
            success: false,
            message:
                "❌ 还没开始游戏"
        };
    }


    if (
        game.type !== "calculate"
    ) {

        return {
            success: false,
            message:
                "❌ 答案不对."
        };
    }


    // ========================================
    // TIME LIMIT
    // ========================================

    if (
        Date.now() >
        game.expiresAt
    ) {

        activeGames.delete(userId);

        return {
            success: true,
            expired: true,

            message:
                `⏰ 时间到!\n\n` +
                `答案是 ${game.answer}.`
        };
    }


    const playerAnswer =
        Number(
            String(answer).trim()
        );


    if (
        Number.isNaN(playerAnswer)
    ) {

        return {
            success: false,

            message:
                "❌ 请输入答案"
        };
    }


    // ========================================
    // CORRECT
    // ========================================

    if (playerAnswer === game.answer) {

        if (game.timer) {
            clearTimeout(game.timer);
        }

        activeGames.delete(userId);

        return {
            success: true,
            correct: true,
            answer: game.answer
        };
    }


    // ========================================
    // WRONG
    // ========================================

    if (game.timer) {
        clearTimeout(game.timer);
    }

    activeGames.delete(userId);

    return {
        success: true,
        correct: false,

        answer:
            game.answer
    };
}


// ============================================
// MEMORIZE ANSWER
// ============================================

function answerMemorize(
    userId,
    answer
) {

    const game =
        activeGames.get(userId);


    if (!game) {

        return {
            success: false,
            message:
                "❌ 并没有开始游戏"
        };
    }


    if (
        game.type !== "memorize"
    ) {

        return {
            success: false,
            message:
                "❌ 答案不对"
        };
    }


    const now =
        Date.now();


    // ========================================
    // TOO EARLY
    // ========================================

    if (
        now <
        game.answerStartedAt
    ) {

        return {
            success: false,

            message:
                "⏳ 题目目前可见!"
        };
    }


    // ========================================
    // TOO LATE
    // ========================================

    if (
        now >
        game.expiresAt
    ) {

        activeGames.delete(userId);

        return {
            success: true,
            expired: true,

            message:
                `⏰ 时间到!\n\n` +
                `正确排法是 ${game.answer}`
        };
    }


    // ========================================
    // CLEAN ANSWER
    // ========================================

    const playerAnswer =
        String(answer)
            .replace(/\s+/g, "")
            .trim();


    // ========================================
    // CORRECT
    // ========================================

    if (
        playerAnswer ===
        game.answer
    ) {

        activeGames.delete(userId);

        return {
            success: true,
            correct: true,

            answer:
                game.answer
        };
    }


    // ========================================
    // WRONG
    // ========================================

    activeGames.delete(userId);

    return {
        success: true,
        correct: false,

        answer:
            game.answer
    };
}


// ============================================
// GUESS ANSWER
// ============================================

function answerGuess(
    userId,
    answer
) {

    const game =
        activeGames.get(userId);


    if (!game) {

        return {
            success: false,
            message:
                "❌ 并没有开始游戏"
        };
    }


    if (
        game.type !== "guess"
    ) {

        return {
            success: false,
            message:
                "❌ This answer doesn't match your current game."
        };
    }


    const playerAnswer =
        Number(
            String(answer).trim()
        );


    if (
        Number.isNaN(playerAnswer)
    ) {

        return {
            success: false,

            message:
                "❌ Please enter a number."
        };
    }


    // ========================================
    // RANGE
    // ========================================

    if (
        playerAnswer < game.min ||
        playerAnswer > game.max
    ) {

        return {
            success: false,

            message:
                `❌ Enter a number between ` +
                `${game.min} and ${game.max}.`
        };
    }


    // ========================================
    // CORRECT
    // ========================================

    if (
        playerAnswer ===
        game.answer
    ) {

        activeGames.delete(userId);

        return {
            success: true,
            correct: true,

            answer:
                game.answer,

            attemptsUsed:
                game.attempts -
                game.remainingAttempts +
                1
        };
    }


    // ========================================
    // WRONG
    // ========================================

    game.remainingAttempts--;


    // ========================================
    // NO ATTEMPTS LEFT
    // ========================================

    if (
        game.remainingAttempts <= 0
    ) {

        activeGames.delete(userId);

        return {
            success: true,

            correct: false,

            finished: true,

            answer:
                game.answer
        };
    }


    // ========================================
    // HINT
    // ========================================

    const hint =
        playerAnswer <
        game.answer
            ? "higher"
            : "lower";


    return {
        success: true,

        correct: false,

        finished: false,

        hint,

        remainingAttempts:
            game.remainingAttempts
    };
}

function expireMathGame(userId) {

    const game = activeGames.get(userId);

    if (!game) {
        return null;
    }

    if (game.completed) {
        return null;
    }

    game.completed = true;

    activeGames.delete(userId);

    return {
        expired: true,

        answer: game.answer,

        message:
            `⏰ 时间到!\n\n` +
            `答案是:\n` +
            `${game.answer}`
    };
}

// ============================================
// QUIZ ANSWER
// ============================================

function answerQuiz(
    userId,
    answer
) {

    const game =
        activeGames.get(userId);


    if (!game) {

        return {
            success: false,

            message:
                "❌ 并没有开始游戏"
        };

    }


    if (
        game.type !== "quiz"
    ) {

        return {
            success: false,

            message:
                "❌ 答案不对"
        };

    }


    const playerAnswer =
        String(answer)
            .trim()
            .toUpperCase();


    if (
        !["A", "B", "C", "D"]
            .includes(playerAnswer)
    ) {

        return {
            success: false,

            message:
                "❌ 请回答 A, B, C, 或者 D."
        };

    }


    // ========================================
    // CORRECT
    // ========================================

    if (
        playerAnswer ===
        game.answer
    ) {

        activeGames.delete(userId);

        return {

            success: true,

            correct: true,

            answer:
                game.answer,

            explanation:
                game.explanation,

            language:
                game.language

        };

    }


    // ========================================
    // WRONG
    // ========================================

    activeGames.delete(userId);

    return {

        success: true,

        correct: false,

        answer:
            game.answer,

        explanation:
            game.explanation,

        language:
            game.language

    };

}
// ============================================
// EXPORT
// ============================================

module.exports = {

    createMathGame,

    getMathGame,

    removeMathGame,

    answerCalculate,

    answerMemorize,

    answerGuess,
    answerQuiz,

    expireMathGame
};