
const uploadForm = document.getElementById("upload-form");

if (uploadForm) {

    uploadForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const output = document.getElementById("upload-result");

        output.textContent = "Analysing dataset...";

        try {

            const response = await fetch(
                "/api/uploads/analyze",
                {
                    method: "POST",
                    body: new FormData(uploadForm)
                }
            );

            const result = await response.json();

            output.textContent = JSON.stringify(
                result,
                null,
                2
            );

        } catch (error) {

            output.textContent =
                "Unable to analyse the uploaded file.";

        }

    });

}
