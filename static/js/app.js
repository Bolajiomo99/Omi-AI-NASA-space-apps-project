
const darkMode = document.getElementById("dark-mode");

if (darkMode) {
    darkMode.addEventListener("change", function () {

        if (darkMode.checked) {
            document.body.style.background = "#102A43";
            document.body.style.color = "#FFFFFF";
        } else {
            document.body.style.background = "";
            document.body.style.color = "";
        }

    });
}
