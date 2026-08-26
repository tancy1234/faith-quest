const fs =
    require("fs");


const path =
    require("path");


// ============================================
// TRIVIA JSON PATH
// ============================================

const triviaPath =
    path.join(
        __dirname,
        "../data/trivia.json"
    );


// ============================================
// ACTIVE TRIVIA
// ============================================

const activeTrivia =
    new Map();

// ============================================
// TRIVIA COOLDOWN
// ============================================

const triviaCooldowns =
    new Map();


const TRIVIA_COOLDOWN =
    3 * 60 * 1000;
// ============================================
// LOAD TRIVIA QUESTIONS
// ============================================

function loadTriviaQuestions() {

    return JSON.parse(
        fs.readFileSync(
            triviaPath,
            "utf8"
        )
    );

}


// ============================================
// GET RANDOM QUESTION
// ============================================

function getRandomTriviaQuestion(
    difficulty
) {

    const questions =
        loadTriviaQuestions();


    const filtered =
        questions.filter(
            question =>
                question.difficulty
                    .toLowerCase() ===
                difficulty.toLowerCase()
        );


    if (
        filtered.length === 0
    ) {

        return null;

    }


    const randomIndex =
        Math.floor(
            Math.random() *
            filtered.length
        );


    return filtered[
        randomIndex
    ];

}


// ============================================
// START TRIVIA
// ============================================

function startTrivia(
    uid,
    difficulty
) {

    // ============================================
    // CHECK ACTIVE TRIVIA FIRST
    // ============================================

    if (
        activeTrivia.has(uid)
    ) {

        return {
            success: false,
            error: "ACTIVE_TRIVIA"
        };

    }


    // ============================================
    // CHECK COOLDOWN
    // ============================================

    const lastTrivia =
        triviaCooldowns.get(
            uid
        );


    if (
        lastTrivia
    ) {

        const remaining =
            TRIVIA_COOLDOWN -
            (
                Date.now() -
                lastTrivia
            );


        if (
            remaining > 0
        ) {

            return {

                success: false,

                error:
                    "COOLDOWN",

                remaining:
                    remaining

            };

        }

    }


    const allowedDifficulty =
        [
            "easy",
            "medium",
            "hard",
            "insane"
        ];


    difficulty =
        difficulty.toLowerCase();


    if (
        !allowedDifficulty.includes(
            difficulty
        )
    ) {

        return {
            success: false,
            error: "INVALID_DIFFICULTY"
        };

    }


    const question =
        getRandomTriviaQuestion(
            difficulty
        );


    if (
        !question
    ) {

        return {
            success: false,
            error: "NO_QUESTION"
        };

    }


    const startedAt =
        Date.now();


    const endTime =
        startedAt +
        8000;


    activeTrivia.set(
        uid,
        {

            uid:
                uid,

            question:
                question,

            difficulty:
                difficulty,

            startedAt:
                startedAt,

            endTime:
                endTime

        }
    );

    triviaCooldowns.set(
        uid,
        Date.now()
    );


    return {

        success: true,

        question:
            question,

        startedAt:
            startedAt,

        endTime:
            endTime

    };

}


// ============================================
// GET ACTIVE TRIVIA
// ============================================

function getActiveTrivia(
    uid
) {

    return (
        activeTrivia.get(
            uid
        ) ||
        null
    );

}


// ============================================
// CHECK ANSWER
// ============================================

function checkTriviaAnswer(
    uid,
    answer
) {

    const active =
        activeTrivia.get(
            uid
        );


    if (
        !active
    ) {

        return {
            success: false,
            error: "NO_ACTIVE_TRIVIA"
        };

    }


    const now =
        Date.now();


    // ========================================
    // TIMEOUT
    // ========================================

    if (
        now >
        active.endTime
    ) {

        activeTrivia.delete(
            uid
        );


        return {

            success: false,

            error:
                "TIMEOUT",

            question:
                active.question

        };

    }


    const normalizedAnswer =
        answer
            .trim()
            .toUpperCase();


    // ========================================
    // INVALID ANSWER
    // ========================================

    if (
        ![
            "A",
            "B",
            "C",
            "D"
        ].includes(
            normalizedAnswer
        )
    ) {

        return {
            success: false,
            error: "INVALID_ANSWER"
        };

    }


    const correct =
        normalizedAnswer ===
        active.question.answer
            .toUpperCase();


    activeTrivia.delete(
        uid
    );


    return {

        success: true,

        correct:
            correct,

        userAnswer:
            normalizedAnswer,

        correctAnswer:
            active.question.answer,

        question:
            active.question,

        difficulty:
            active.difficulty

    };

}


// ============================================
// EXPIRE TRIVIA
// ============================================

function expireTrivia(
    uid
) {

    const active =
        activeTrivia.get(
            uid
        );


    if (
        !active
    ) {

        return null;

    }


    activeTrivia.delete(
        uid
    );


    return active;

}


// ============================================
// EXPORT
// ============================================

module.exports = {

    loadTriviaQuestions,

    getRandomTriviaQuestion,

    startTrivia,

    getActiveTrivia,

    checkTriviaAnswer,

    expireTrivia

};