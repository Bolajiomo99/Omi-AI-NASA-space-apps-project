
const chatForm = document.getElementById("chat-form");

if (chatForm) {

    chatForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const question = document.getElementById("question");
        const output = document.getElementById("chat-output");

        output.textContent = "Sending...";

        try {

            const response = await fetch(
                "/api/assistant/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        question: question.value
                    })
                }
            );

            const result = await response.json();

            output.textContent =
                result.answer || result.error;

        } catch (error) {

            output.textContent =
                "Unable to connect to the assistant.";

        }

    });

}
