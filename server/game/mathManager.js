const mathQuiz =
    require("/Users/tcy/Desktop/christian-chat-game/server/data/math_questions_shuffled.json");

// ============================================
// C#Math Manager
// ============================================

function randomInt(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


// ============================================
// DIFFICULTY
// ============================================

const difficulties = {
    easy: {
        calculate: {
            min: 1,
            max: 50,
            operations: ["+", "-"]
        },

        memorize: {
            length: 4,
            showTime: 2000
        },

        guess: {
            min: 1,
            max: 20,
            attempts: 5
        }
    },

    medium: {
        calculate: {
            min: 10,
            max: 100,
            operations: ["+", "-", "*"]
        },

        memorize: {
            length: 8,
            showTime: 2500
        },

        guess: {
            min: 1,
            max: 50,
            attempts: 6
        }
    },

    hard: {
        calculate: {
            min: 10,
            max: 200,
            operations: ["+", "-", "*", "/"]
        },

        memorize: {
            length: 16,
            showTime: 3000
        },

        guess: {
            min: 1,
            max: 100,
            attempts: 7
        }
    }
};


// ============================================
// CALCULATE
// ============================================

function generateCalculate(difficulty) {

    const config =
        difficulties[difficulty];

    if (!config) {
        return null;
    }

    const settings =
        config.calculate;

    let a = randomInt(
        settings.min,
        settings.max
    );

    let b = randomInt(
        settings.min,
        settings.max
    );

    const operation =
        settings.operations[
            randomInt(
                0,
                settings.operations.length - 1
            )
        ];

    let answer;

    // Make division clean
    if (operation === "/") {

        answer = randomInt(
            settings.min,
            Math.max(
                settings.min,
                Math.floor(settings.max / 2)
            )
        );

        b = randomInt(
            2,
            12
        );

        a = answer * b;

    } else if (operation === "+") {

        answer = a + b;

    } else if (operation === "-") {

        // Avoid negative answers
        if (b > a) {
            [a, b] = [b, a];
        }

        answer = a - b;

    } else if (operation === "*") {

        answer = a * b;
    }

    return {
        type: "calculate",
        difficulty,

        question:
            `${a} ${operation} ${b}`,

        answer
    };
}


// ============================================
// MEMORIZE
// ============================================

function generateMemorize(difficulty) {

    const config =
        difficulties[difficulty];

    if (!config) {
        return null;
    }

    const settings =
        config.memorize;

    const sequence = [];

    for (
        let i = 0;
        i < settings.length;
        i++
    ) {
        sequence.push(
            randomInt(0, 9)
        );
    }

    return {
        type: "memorize",
        difficulty,

        sequence,

        answer:
            sequence.join(""),

        showTime:
            settings.showTime
    };
}


// ============================================
// MATH QUIZ
// ============================================

function generateQuiz(
    difficulty,
    language = "zh"
) {

    const questions =
        mathQuiz.filter(
            question =>
                question.difficulty === difficulty
        );

    if (questions.length === 0) {
        return null;
    }

    const question =
        questions[
            randomInt(
                0,
                questions.length - 1
            )
        ];

    return {

        type: "quiz",

        difficulty,

        id:
            question.id,

        field:
            question.field,

        question:
            question.question,

        options:
            question.options,

        answer:
            question.answer,

        explanation:
            question.explanation,

        language

    };
}


// ============================================
// EXPORT
// ============================================

module.exports = {

    difficulties,

    generateCalculate,
    generateMemorize,
    
    generateQuiz

};;