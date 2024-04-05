document.querySelector(".uploadDialogue h1").innerText = 'Create a file in "'+window.decodeURI(window.location.href).split("/")[window.decodeURI(window.location.href).split("/").length-1]+'"'+":"
document.querySelector(".createFolderDialogue h1").innerText = 'Create a folder in "'+window.decodeURI(window.location.href).split("/")[window.decodeURI(window.location.href).split("/").length-1]+'"'+":"

document.querySelector(".uploadDialogue .folderPathVar").setAttribute("value", window.location.href);
document.querySelector(".createFolderDialogue .folderPathVar").setAttribute("value", window.location.href);


// Check processing status periodically
let processingChecker = setInterval(checkProcessingStatus, 5000); // Check every 5 seconds (5000 milliseconds)

function navigateToUrl(url) {
    console.log(url)
    window.location.href = url;
}

let processingCheckerEnder = setInterval(() => {
    if(!document.querySelector(".processing")){
        clearInterval(processingChecker);
        clearInterval(processingCheckerEnder);
    }
}, 5000)

//buttons to allow opening and closing of popup windows
function uploadFile() {
    document.getElementById('popupContainer').style.display =  "flex";
    document.getElementsByClassName('uploadDialogue')[0].style.display =  "flex";
}
function closeUploadFile() {
    document.getElementById('popupContainer').style.display =  "none";
    document.getElementsByClassName('uploadDialogue')[0].style.display =  "none";
}

//buttons to allow opening and closing of popup windows
function createFolder() {
    document.getElementById('popupContainer').style.display =  "flex";
    document.getElementsByClassName('createFolderDialogue')[0].style.display =  "flex";
}
function closeCreateFolder() {
    document.getElementById('popupContainer').style.display =  "none";
    document.getElementsByClassName('createFolderDialogue')[0].style.display =  "none";
}

//updates filename when new file selected
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const fileNameSpan = document.querySelector('.fileInputLabelName');

    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            // Update the span with the selected file name
            fileNameSpan.textContent = fileInput.files[0].name;
        } else {
            // No file selected, revert to default text
            fileNameSpan.textContent = "Select a file...";
        }
    });
});

//will be used to implement loading screen.
document.querySelector(".uploadDialogue form").addEventListener('submit', function(event) {
    console.log("loading")

    // Check processing status periodically
    let processingChecker = setInterval(checkProcessingStatus, 5000); // Check every 5 seconds (5000 milliseconds)

    let processingCheckerEnder = setInterval(() => {
        if(!document.querySelector(".processing")){
            clearInterval(processingChecker);
            clearInterval(processingCheckerEnder);
        }
    }, 5000)
});
console.log(document.querySelector("#main-content > div.traversal-detail > input[type=text]").value)

// Function to check processing status and update icon if needed
function checkProcessingStatus() {
    if (document.querySelector(".processing")) {
        fetch('/processing_check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "filename": "&&d&&" + document.querySelector("#main-content > div.traversal-detail > input[type=text]").value.replace("/home/", "") + "&&d&&" + document.querySelector(".processing").parentNode.innerText
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("not processed")

            if (data === false) {
                console.log("processed")
                document.querySelector(".processing").setAttribute("src", document.querySelector(".processing").getAttribute("src").replace("file_loading_icon.gif", "file_icon.png"))
                document.querySelector(".processing").classList.remove("processing");
            }
        })
        .catch(error => {
            console.error('Error checking processing status:', error);
        });
    }
}