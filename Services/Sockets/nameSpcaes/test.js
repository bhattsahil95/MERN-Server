// testNamespace.js
const handleTestNamespace = (testNamespace) => {
    testNamespace.on("connection", (socket) => {
        console.log(`JOINED /test ==> ${socket.id}`);

        socket.on("testEvent", (data) => {
            console.log("Received data in the test namespace:", data);
        });

        socket.on("disconnect", () => {
            console.log(`LEFT /test ==> ${socket.id} `);
        });
    });
};

export default handleTestNamespace;
