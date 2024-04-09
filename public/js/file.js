// Will execute if not processed yet
if(document.querySelector(".main-content-file").classList.contains("processing")){
    // Creating a semi-transparent overlay to prevent user interaction
    let element = document.createElement("div")
    element.setAttribute("style", `width: ${document.body.clientWidth}px; height: ${document.body.clientHeight}px; background-color:rgb(50,50,50,0.9); position: absolute; top:0px; `)
    document.body.appendChild(element)
    // Setting the iframe's z-index and position
    document.querySelector("iframe").setAttribute("style", "z-index:1; position: fixed; height:50%;")
    // Periodically updating the overlay's size
    setInterval(() => {
        element.setAttribute("style", `width: ${document.body.clientWidth}px; height: ${document.body.clientHeight}px; background-color:rgb(50,50,50,0.9); position: absolute; top:75px; z-index: 0;`)
    }, 500);
    // Appending the overlay and setting z-index for other elements
    document.body.appendChild(element)
    document.querySelector("iframe").setAttribute("style", "z-index:1; position: fixed; height:50%;")
    document.querySelector(".traversal-detail").setAttribute("style", "z-index:2;")
    // Creating a dialogue box for file processing message
    let dialogue = document.createElement("div");
    dialogue.setAttribute("style", `width: 300px; height: 300px; position: absolute; top:75px; left:70%;color:black; background-color:white; padding:10px;     border-radius: 10px;
    -webkit-border-radius: 10px;
    -moz-border-radius: 10px;
    -ms-border-radius: 10px;
    -o-border-radius: 10px;`)
    dialogue.innerHTML+="\n<img src='/images/file_loading_icon.gif' width='200px' alt='loading file gif'><br>This file is still processing...\nThis page will automatically refresh on completion"
    document.body.appendChild(dialogue)

    // Periodically checking if the file processing is complete
    setInterval(function(){
        fetch('/processing_check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "filename": document.querySelector("input[name='filename']").value.replace(".pdf", "")
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("not processed")

            if (data === false) {
                window.location.reload();
            }
        })
        .catch(error => {
            console.error('Error checking processing status:', error);
        });
    }, 5000)
}
// If processed, execute rest of file
else{
    setInterval(function(){
        document.querySelector(".view-container").setAttribute("style", `max-height:${document.querySelector(".quiz-view").clientHeight}px;`)
    }, 100)

    document.querySelector(".messages").scrollTop = document.querySelector(".messages").scrollHeight

    function navigateToUrl(url) {
        console.log(url)
        window.location.href = url;
    }

    let currentQuiz;
    let finalAnswers;

    function createQuiz(event){
        event.preventDefault();
        if(event.srcElement["option"].value == ""){
            let options = 0;
            for(let option of event.srcElement["option"]){
                document.querySelector("label[for='"+option.getAttribute("id")+"']").setAttribute("style", "background-color:red");
                setTimeout(function(){
                    document.querySelector("label[for='"+option.getAttribute("id")+"']").removeAttribute("style");
                }, 3000+options*50)
                options++;
            }
            return;
        }
    
        document.querySelector(".quiz-view").innerHTML = `
            <img class="loading" src="/images/quiz-loading.gif" alt="loading gif">
            <div class="loading-text">Creating the quiz!</div>
        `
    
        fetch("/create_quiz", {
            "method": "POST",
            "headers": {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            "body": JSON.stringify({"filename":event.srcElement["filename"].value, "numberOfQuestions":event.srcElement["option"].value})
        })
        .then(response => {
            if (response.ok) {
                return response.json(); // Parse response body as JSON
            }
            else{
                throw new Error("Network response was not ok.");
            }
        })
        .then(data => {
            currentQuiz = data;
            document.querySelector(".quiz-view").innerHTML = `<span class='attempt-quiz'>Once you begin, you have ${event.srcElement["option"].value} minutes to complete this quiz.<button onclick='displayQuiz()'>Begin?</button></span>`
        })
        .catch(error => {
            // Handle errors
            console.error("There was a problem with the request:", error);
        });
    }
    
    function displayQuiz(preLoaded = false){
        if(preLoaded){
            currentQuiz = document.querySelector("#preloadedQuiz").textContent;
            console.log(currentQuiz)
            // Parse the JSON string to a JavaScript object
            currentQuiz = JSON.parse(currentQuiz);
            // Now you can use the jsonObject as needed
            console.log(currentQuiz);
        }
    
        let quiz = JSON.parse(currentQuiz.quiz);
    
        let numberOfQuestions = 0;
        for(let part in quiz){
            numberOfQuestions++;
        }
    
        let newHTML = ""
        newHTML = `<form onsubmit='markQuiz(event)' class='do-quiz'><div class='quiz-title'>Quiz<br>${numberOfQuestions} Questions<span>${numberOfQuestions}:00</span></div>`
    
        for(let part in quiz){
            newHTML += `
                <div class="field">
                    <div class='question-number'>${part}</div>
                    <div class='question'>${quiz[part]["Q"]}</div>
    
                    <input name="${part}-answer" type="radio" id="${part}-A" value="A" hidden>
                    <label class="answer-select" for="${part}-A">${quiz[part]["A"]}</label>
    
                    <input name="${part}-answer" type="radio" id="${part}-B" value="B" hidden>
                    <label class="answer-select" for="${part}-B">${quiz[part]["B"]}</label>
    
                    <input name="${part}-answer" type="radio" id="${part}-C" value="C" hidden>
                    <label class="answer-select" for="${part}-C">${quiz[part]["C"]}</label>
    
                    <input name="${part}-answer" type="radio" id="${part}-D" value="D" hidden>
                    <label class="answer-select" for="${part}-D">${quiz[part]["D"]}</label>
    
                    <input name="${part}-answer" type="radio" value="none" hidden checked>
                </div>
            `
        }
        document.querySelector(".quiz-view").innerHTML = newHTML+"<button class='submit-button' onclick='submitEarly()' type='button'>Finish</button></form>"
    
        console.log(currentQuiz["began"])
        if(currentQuiz["began"] == null){
            const timestamp = Date.now();
            fetch("/start_quiz", {
                "method": "POST",
                "headers": {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
                },
                "body": JSON.stringify({"filename":document.querySelector('input[name="filename"]').value, "time":timestamp})
            })
            .then(response => {
                if (response.ok) {
                    console.log(timestamp)
                    startTimer(timestamp, numberOfQuestions);
                }
                else{
                    throw new Error("Network response was not ok.");
                }
            })
            .catch(error => {
                // Handle errors
                console.error("There was a problem with the request:", error);
            });
        }
        else{
            startTimer(currentQuiz["began"], numberOfQuestions);
        }
    }
    
    var timerInterval;
    function startTimer(timestamp, limit){
        let timer = document.querySelector(".quiz-title span");
    
        limit = limit * 60 * 1000;
    
        let timeRemaining = limit; // Initial value for time remaining
    
        timerInterval = setInterval(() => {
            // Calculate the elapsed time since the timestamp
            const elapsedTime = Date.now() - timestamp;
    
            // Calculate the time remaining by subtracting the elapsed time from the time limit
            timeRemaining = Math.max(limit - elapsedTime, 0); // Ensure time remaining doesn't go negative
    
            // Check if time is up
            if (timeRemaining <= 0) {
                clearInterval(timerInterval); // Stop the interval
                finalAnswers = new FormData(document.querySelector(".do-quiz"))
                document.querySelector(".quiz-view").innerHTML = `<span class='attempt-quiz'>You have run out of time!<button onclick='submitQuiz()'>Submit quiz</button></span>`
            } else {
                timer.innerText = formatTime(timeRemaining);
            }
        }, 100);
    }
    
    function submitEarly(){
        clearInterval(timerInterval);
        finalAnswers = new FormData(document.querySelector('.do-quiz'));
        submitQuiz();
    }
    
    function submitQuiz(pastQuiz = null, date = null){
        if(pastQuiz != null){
            console.log(pastQuiz)
            let marks = 0;
            let quizMarked = JSON.parse(pastQuiz);
            let numberOfQuestions = 0;
            for (let part in quizMarked) {
                if(quizMarked[part]["result"]){
                    marks++;
                }
                numberOfQuestions++;
            }
    
            newHTML = `<form onsubmit='markQuiz(event)' class='do-quiz done'><div class='quiz-title'>Quiz<br>${numberOfQuestions} Questions<br>${date}<span style="color:${(marks/numberOfQuestions)>0.5?"yellowgreen":"#dd4b39"}">${marks} / ${numberOfQuestions}</span></div>`
            for(let part in quizMarked){
                newHTML += `
                    <div class="field">
                        <div class='question-number'>${part}</div>
                        <div class='question ${quizMarked[part]["result"]?"correct":"incorrect"}'>${quizMarked[part]["Q"]}</div>
    
                        <input name="${part}-answer" type="radio" id="${part}-A" value="A" hidden disabled>
                        <label class="answer-select ${quizMarked[part]["selected"]=="A"?"selected-answer":""}  ${quizMarked[part]["CA"]=="A"?"correct-answer":""}" for="${part}-A">${quizMarked[part]["A"]}</label>
    
                        <input name="${part}-answer" type="radio" id="${part}-B" value="B" hidden disabled>
                        <label class="answer-select  ${quizMarked[part]["selected"]=="B"?"selected-answer":""}  ${quizMarked[part]["CA"]=="B"?"correct-answer":""}" for="${part}-B">${quizMarked[part]["B"]}</label>
    
                        <input name="${part}-answer" type="radio" id="${part}-C" value="C" hidden disabled>
                        <label class="answer-select  ${quizMarked[part]["selected"]=="C"?"selected-answer":""}  ${quizMarked[part]["CA"]=="C"?"correct-answer":""}" for="${part}-C">${quizMarked[part]["C"]}</label>
    
                        <input name="${part}-answer" type="radio" id="${part}-D" value="D" hidden disabled>
                        <label class="answer-select  ${quizMarked[part]["selected"]=="D"?"selected-answer":""}  ${quizMarked[part]["CA"]=="D"?"correct-answer":""}" for="${part}-D">${quizMarked[part]["D"]}</label>
    
                        ${quizMarked[part]["selected"]=="none"?'<div class="none-selected">You did not select an answer.</div>':""}
                    </div>
                `
            }
            document.querySelector(".quiz-view").innerHTML = newHTML+"</form>"
            document.querySelector('.quiz-view').scrollTop = 0;
        }
        else{
            let marks = 0;
            let quizMarked = JSON.parse(currentQuiz.quiz);
            let numberOfQuestions = 0;
            for (const [name, value] of finalAnswers.entries()) {
                if(quizMarked[`${name.replace("-answer", "")}`]["CA"] == value){
                    quizMarked[`${name.replace("-answer", "")}`].result = true;
                    marks++;
                }else{
                    quizMarked[`${name.replace("-answer", "")}`].result = false;
                }
                quizMarked[`${name.replace("-answer", "")}`].selected = value;
                numberOfQuestions++;
            }
            newHTML = `<form onsubmit='markQuiz(event)' class='do-quiz done'><div class='quiz-title'>Quiz<br>${numberOfQuestions} Questions<span style="color:${(marks/numberOfQuestions)>0.5?"yellowgreen":"#dd4b39"}">${marks} / ${numberOfQuestions}</span></div>`
            for(let part in quizMarked){
                newHTML += `
                    <div class="field">
                        <div class='question-number'>${part}</div>
                        <div class='question ${quizMarked[part]["result"]?"correct":"incorrect"}'>${quizMarked[part]["Q"]}</div>
    
                        <input name="${part}-answer" type="radio" id="${part}-A" value="A" hidden disabled>
                        <label class="answer-select ${quizMarked[part]["selected"]=="A"?"selected-answer":""}  ${quizMarked[part]["CA"]=="A"?"correct-answer":""}" for="${part}-A">${quizMarked[part]["A"]}</label>
    
                        <input name="${part}-answer" type="radio" id="${part}-B" value="B" hidden disabled>
                        <label class="answer-select  ${quizMarked[part]["selected"]=="B"?"selected-answer":""}  ${quizMarked[part]["CA"]=="B"?"correct-answer":""}" for="${part}-B">${quizMarked[part]["B"]}</label>
    
                        <input name="${part}-answer" type="radio" id="${part}-C" value="C" hidden disabled>
                        <label class="answer-select  ${quizMarked[part]["selected"]=="C"?"selected-answer":""}  ${quizMarked[part]["CA"]=="C"?"correct-answer":""}" for="${part}-C">${quizMarked[part]["C"]}</label>
    
                        <input name="${part}-answer" type="radio" id="${part}-D" value="D" hidden disabled>
                        <label class="answer-select  ${quizMarked[part]["selected"]=="D"?"selected-answer":""}  ${quizMarked[part]["CA"]=="D"?"correct-answer":""}" for="${part}-D">${quizMarked[part]["D"]}</label>
    
                        ${quizMarked[part]["selected"]=="none"?'<div class="none-selected">You did not select an answer.</div>':""}
                    </div>
                `
            }
            document.querySelector(".quiz-view").innerHTML = newHTML+"</form>"
            document.querySelector('.quiz-view').scrollTop = 0;
    
            fetch("/mark_quiz", {
                "method": "POST",
                "headers": {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
                },
                "body": JSON.stringify({"filename":document.querySelector('input[name="filename"]').value, "quiz":quizMarked})
            })
            .then(response => {
                if (response.ok) {
                }
                else{
                    throw new Error("Network response was not ok.");
                }
            })
            .catch(error => {
                // Handle errors
                console.error("There was a problem with the request:", error);
            });
        }
    }

    function formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function resetHistory(){
        fetch("/reset_history", {
            "method": "POST",
            "headers": {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            "body": JSON.stringify({
                "filename": document.querySelector('input[name="filename"]').value,
            })
        })
        .then(response => {
            if (response.ok) {
                window.location.reload();
            } else {
                throw new Error("Network response was not ok.");
            }
        })
        .catch(error => {
            // Handle errors
            console.error("There was a problem with the request:", error);
        });
    }
    
    function deleteFile(){
        var confirmed = window.confirm("Are you sure you want to delete this document?");
        if (confirmed) {
            fetch("/delete_file", {
                "method": "POST",
                "headers": {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                "body": JSON.stringify({
                    "filename": document.querySelector('input[name="filename"]').value,
                })
            })
            .then(response => {
                if (response.ok) {
                    window.location.href = "/home/"+document.querySelector('input[name="filename"]').value.split("&&d&&")[2];
                } else {
                    throw new Error("Network response was not ok.");
                }
            })
            .catch(error => {
                // Handle errors
                console.error("There was a problem with the request:", error);
            });
        }
    }

    document.querySelector("#main-content > div.interact > div.chat-container > div.chat-interact > form").addEventListener("click", function(){
        document.querySelector("#main-content > div.interact > div.chat-container > div.chat-interact > form > input[type=text]:nth-child(1)").focus();
    })

    document.addEventListener("DOMContentLoaded", function() {
        // Get the form element
        var form = document.querySelector(".chat-container form");

        // Add event listener for form submission
        form.addEventListener("submit", function(event) {
            // Prevent the default form submission
            event.preventDefault();

            // Gather form data
            var formData = new FormData(form);
            let historiesEl = document.querySelectorAll(".chat-container .message");
            let histories = [];
            let completeHistory = [];
            let responseLoader;

            for(let history of historiesEl){
                if(!history.classList.contains("greeting")){
                    console.log(history)
                    if(history.classList.contains("question")){
                        history = history.querySelector(".message-body");
                        histories.push("Q: "+history.innerText);
                        completeHistory.push("Q: "+history.innerHTML);
                    }else if(history.classList.contains("answer")){
                        history = history.querySelector(".message-body");
                        histories.push("A: "+history.innerText);
                        completeHistory.push("A: "+history.innerHTML);
                    }
                }
            }

            console.log(histories)

            if(histories.length>3){
                histories.reverse().splice(4, histories.length);
                histories.reverse();
            }

            // Create a new div element
            let messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'question', 'animated');
            messageDiv.innerHTML = `
                <div class="message-header">
                    <img src="/images/question-chat.png" alt="answer chat icon"> You:
                </div>
                <div class="message-body">
                    ${formData.get("message")}
                </div>
            `;
            document.querySelector(".chat-container .messages").appendChild(messageDiv);

            setTimeout(() => {
                messageDiv.classList.remove("animated");

                // Create a new div element
                messageDiv = document.createElement('div');
                messageDiv.classList.add('message', 'answer', 'animated');
                messageDiv.setAttribute("style", "animation: blink 2s infinite")
                messageDiv.innerHTML = `
                    <div class="message-header">
                        <img src="/images/answer-chat.png" alt="answer chat icon"> SummarizePro:
                    </div>
                    <div class="message-body">
                        Thinking...
                    </div>
                `;
                document.querySelector(".chat-container .messages").appendChild(messageDiv);
    
                setTimeout(() => {
                    messageDiv.classList.remove("animated");
                }, 2500);
    
                const intervalId = setInterval(() => {
                    if (messageDiv && messageDiv.classList.contains("animated")) {
                        document.querySelector(".chat-container .messages").scrollTop = document.querySelector(".chat-container .messages").scrollHeight;
                    } else {
                        clearInterval(intervalId); // Stop the interval if the element doesn't have the class or doesn't exist
                    }
                }, 12);
    
                responseLoader = setInterval(() => {
                    let text = messageDiv.querySelector(".message-body");
                    if (text.innerText.startsWith("Thinking")) {
                        let dots = text.innerText.match(/\.{0,4}$/)[0];
                        let nextDots = dots.length < 4 ? dots + '.' : '';
                        text.innerText = `Thinking${nextDots}`;
                    }
                }, 1000);
            }, 2500);
    
            const intervalId = setInterval(() => {
                if (messageDiv && messageDiv.classList.contains("animated")) {
                    document.querySelector(".chat-container .messages").scrollTop = document.querySelector(".chat-container .messages").scrollHeight;
                } else {
                    clearInterval(intervalId); // Stop the interval if the element doesn't have the class or doesn't exist
                }
            }, 12);
    
            //clear value in input
            let input = document.querySelector(".chat-interact form input[name='message']");
            input.disabled = true;
            input.value = "";
            input.setAttribute("placeholder", "SummarizePro is generating a response...");
            let button = document.querySelector(".chat-interact form button");
            button.disabled = true;
            form.setAttribute("style", "background-color:black");
    
            // Make a POST request
            fetch("/message", {
                "method": "POST",
                "headers": {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
                },
                "body": JSON.stringify({question:formData.get("message"), filename:formData.get("filename"), contextual_history:histories.join("\n"), complete_history:completeHistory})
            })
            .then(response => {
                // Handle response
                if (response.ok) {
                    return response.json(); // Parse response body as JSON
                }
                throw new Error("Network response was not ok.");
            })
            .then(data => {
                // Handle successful response
                clearInterval(responseLoader);
                messageDiv.setAttribute("style", "animation: none")
                messageDiv.querySelector(".message-body").innerHTML = data.message;

                input.disabled = false;
                button.disabled = false;
                form.setAttribute("style", "background-color:null");
                input.setAttribute("placeholder", "Type here to chat...");
            })
            .catch(error => {
                // Handle errors
                console.error("There was a problem with the request:", error);
            });
        });
    });

}
