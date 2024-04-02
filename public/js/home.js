document.querySelector(".uploadDialogue h1").innerText = 'Create a file in "'+window.decodeURI(window.location.href).split("/")[window.decodeURI(window.location.href).split("/").length-1]+'"'+":"
document.querySelector(".createFolderDialogue h1").innerText = 'Create a folder in "'+window.decodeURI(window.location.href).split("/")[window.decodeURI(window.location.href).split("/").length-1]+'"'+":"

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
});
