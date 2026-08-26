const cron = require("node-cron");
const db = require("../config/firebase");


function startWeeklyDedicateReset() {

    // Every Monday at 00:00
    cron.schedule(
        "0 0 * * 1",
        async () => {

            console.log(
                "Weekly dedication reset started"
            );

            try {

                const snapshot =
                    await db.collection("users")
                    .get();


                if (snapshot.empty) {

                    console.log(
                        "No users found for dedication reset."
                    );

                    return;

                }


                // Reset dedication status
                for (const doc of snapshot.docs) {

                    await db.collection("users")
                        .doc(doc.id)
                        .update({

                            lastDedicateAt: null

                        });

                }


                console.log(
                    "Weekly dedication reset completed."
                );

            }
            catch (error) {

                console.error(
                    "Weekly dedication reset error:",
                    error
                );

            }

        },
        {
            timezone: "Asia/Kuala_Lumpur"
        }
    );

}


module.exports =
    startWeeklyDedicateReset;