setInterval(function(){
    document.querySelector(".view-container").setAttribute("style", `max-height:${document.querySelector(".quiz-view").clientHeight}px;`)
}, 100)



function navigateToUrl(url) {
    console.log(url)
    window.location.href = url;
}

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

    // fetch("/create_quiz", {
    //     "method": "POST",
    //     "headers": {
    //     'Accept': 'application/json',
    //     'Content-Type': 'application/json'
    //     },
    //     "body": JSON.stringify({"filename":event.srcElement["filename"].value, "numberOfQuestions":event.srcElement["option"].value})
    // })
    // .then(response => {
    //     if (response.ok) {
    //         return response.json(); // Parse response body as JSON
    //     }
    //     throw new Error("Network response was not ok.");
    // })
    // .then(data => {
    //     for(part in data){
    //         console.log(data[part]["Q"])
    //         console.log("          A: "+data[part]["A"])
    //         console.log("          B: "+data[part]["B"])
    //         console.log("          C: "+data[part]["C"]);
    //         console.log("          D: "+data[part]["D"])
    //     }
    // })
    // .catch(error => {
    //     // Handle errors
    //     console.error("There was a problem with the request:", error);
    // });
    let jason = JSON.parse(`
    {
        "Q1": {
         "Q": "Who was Lennie instructed to hide from?",
         "A": "George",
         "B": "Curley",
         "C": "Candy",
         "D": "Slim",
         "CA": "B"
        },
        "Q2": {
         "Q": "What physical feature did Curley's wife have?",
         "A": "Red hair",
         "B": "Large eyes",
         "C": "Full lips",
         "D": "Long fingernails",
         "CA": "D"
        },
        "Q3": {
         "Q": "What advice did George give Lennie about Curley's wife?",
         "A": "Don't speak to her",
         "B": "Don't look at her",
         "C": "Don't touch her",
         "D": "All of the above",
         "CA": "D"
        },
        "Q4": {
         "Q": "What did Lennie find by the river?",
         "A": "A dead bird",
         "B": "A water snake",
         "C": "A mouse",
         "D": "A Luger",
         "CA": "C"
        },
        "Q5": {
         "Q": "Who did Curley suspect of stealing his Luger?",
         "A": "Lennie",
         "B": "Candy",
         "C": "George",
         "D": "Slim",
         "CA": "A"
        }
    }
    `)

    let newHTML = ""
    newHTML = "<form onsubmit='markQuiz(event)' class='do-quiz'>"
    for(let part in jason){
        newHTML += `
            <div class="field">
                <div class='question-number'>${part}</div>
                <div class='question'>${jason[part]["Q"]}</div>

                <input name="${part}-answer" type="radio" id="${part}-A" value="A" hidden>
                <label class="answer-select" for="${part}-A">${jason[part]["A"]}</label>

                <input name="${part}-answer" type="radio" id="${part}-B" value="B" hidden>
                <label class="answer-select" for="${part}-B">${jason[part]["B"]}</label>

                <input name="${part}-answer" type="radio" id="${part}-C" value="C" hidden>
                <label class="answer-select" for="${part}-C">${jason[part]["C"]}</label>

                <input name="${part}-answer" type="radio" id="${part}-D" value="D" hidden>
                <label class="answer-select" for="${part}-D">${jason[part]["D"]}</label>
            </div>
        `
    }
    document.querySelector(".quiz-view").innerHTML = newHTML+"</form>"

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
