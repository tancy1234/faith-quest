const cron =
    require("node-cron");

const db =
    require("../config/firebase");


// ============================================
// WEEK KEY
// ============================================

function getMalaysiaWeekKey() {

    const now =
        new Date();


    const malaysiaDate =
        new Date(
            now.toLocaleString(
                "en-US",
                {
                    timeZone:
                        "Asia/Kuala_Lumpur"
                }
            )
        );


    // Get Monday of current week
    const day =
        malaysiaDate.getDay();


    const diff =
        day === 0
            ? -6
            : 1 - day;


    malaysiaDate.setDate(
        malaysiaDate.getDate() +
        diff
    );


    const year =
        malaysiaDate.getFullYear();


    const month =
        String(
            malaysiaDate.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const date =
        String(
            malaysiaDate.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${date}`;

}


// ============================================
// RUN WEEKLY RESET
// ============================================

async function runWeeklyReset() {

    console.log(
        "Weekly settlement started"
    );


    const weekKey =
        getMalaysiaWeekKey();


    const resetRef =
        db.collection("global")
            .doc("weeklyReset");


    const resetDoc =
        await resetRef.get();


    // ========================================
    // ALREADY COMPLETED THIS WEEK
    // ========================================

    if (
        resetDoc.exists &&
        resetDoc.data()
            .lastResetWeek ===
            weekKey
    ) {

        console.log(
            "Weekly reset already completed:",
            weekKey
        );

        return;

    }


    // ========================================
    // GET USERS
    // ========================================

    const snapshot =
        await db.collection("users")
            .orderBy(
                "points",
                "desc"
            )
            .get();


    const users = [];


    snapshot.forEach(
        doc => {

            users.push({

                id:
                    doc.id,

                ...doc.data()

            });

        }
    );


    if (
        users.length === 0
    ) {

        console.log(
            "No users found"
        );


        await resetRef.set(
            {

                lastResetWeek:
                    weekKey,

                completedAt:
                    Date.now()

            },
            {
                merge: true
            }
        );


        return;

    }


    // ========================================
    // HIGHEST POINTS
    // ========================================

    const highestPoints =
        Number(
            users[0].points
        ) || 0;


    // ========================================
    // GIVE STAR
    // ========================================

    if (
        highestPoints === 0
    ) {

        console.log(
            "No winner this week"
        );

    }
    else {

        for (
            const user of users
        ) {

            const userPoints =
                Number(
                    user.points
                ) || 0;


            if (
                userPoints ===
                highestPoints
            ) {

                await db
                    .collection(
                        "users"
                    )
                    .doc(
                        user.id
                    )
                    .update({

                        stars:
                            (
                                user.stars ||
                                0
                            ) + 1

                    });


                console.log(
                    "Star awarded:",
                    user.username
                );

            }

        }

    }


    // ========================================
    // RESET ALL POINTS
    // ========================================

    for (
        const user of users
    ) {

        await db
            .collection(
                "users"
            )
            .doc(
                user.id
            )
            .update({

                points:
                    0

            });

    }


    // ========================================
    // SAVE COMPLETED WEEK
    // ========================================

    await resetRef.set(
        {

            lastResetWeek:
                weekKey,

            completedAt:
                Date.now(),

            highestPoints:
                highestPoints

        },
        {
            merge: true
        }
    );


    console.log(
        "Weekly reset completed:",
        weekKey
    );

}


// ============================================
// START CRON
// ============================================

function startWeeklyReset() {

    cron.schedule(
        "0 0 * * 1",

        async () => {

            try {

                await runWeeklyReset();

            }
            catch (
                error
            ) {

                console.error(
                    "WEEKLY RESET ERROR:",
                    error
                );

            }

        },

        {
            timezone:
                "Asia/Kuala_Lumpur"
        }
    );


    console.log(
        "Weekly reset scheduler started"
    );

}


// ============================================
// EXPORT
// ============================================

module.exports =
    startWeeklyReset;


module.exports.runWeeklyReset =
    runWeeklyReset;