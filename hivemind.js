const channel_id = 'jegnoPBweXwNxzew';
var drone;
var room;
var roomname;
var username;
var membersArray = [];
var mode = "notConnected";
var answers = [];
var abstains = 0;
var countdownStarted = false;

function joinRoom() {
  if (document.getElementById("userNameField").value == "") {
    document.getElementById("usernameIsRequired").hidden = false;
  } else {
    drone = new ScaleDrone(channel_id, {
      data: {
        username: document.getElementById("userNameField").value,
      }
    });
    username = document.getElementById("userNameField").value;
    document.getElementById("usernameIsRequired").hidden = true;
    room = drone.subscribe("observable-" + document.getElementById("roomNameField").value);
    roomname = document.getElementById("roomNameField").value;
    room.on('members', function(members) {
      membersArray = members;
      updateMembers();
    });
    room.on('open', error => {
      if (error) {
        console.log(error);
        leaveRoom();
        alert("Error joining room");
      }
      room.on('message', message => onMessage(message));
      room.on('member_join', function(member) {
        membersArray.push(member);
        updateMembers();
      });
      room.on('member_leave', function(leavingMember) {
        membersArray = membersArray.filter(
          member => member.clientData.username != leavingMember.clientData.username);
        updateMembers();
      });
      document.getElementById("preJoinControls").hidden = true;
      document.getElementById("postJoinControls").hidden = false;
      document.getElementById("roomNameOutput").textContent = "\"" + roomname + "\"";
      mode = "question";
      onNewMode();
    });
  }
}

function leaveRoom() {
  room.unsubscribe();
  drone.close();
  drone = null;
  room = null;
  username = null;
  mode = "notConnected";
  document.getElementById("questionsAndAnswers").innerHTML = "";
  document.getElementById("preJoinControls").hidden = false;
  document.getElementById("postJoinControls").hidden = true;
  document.getElementById("roomNameField").value = ""
  onNewMode();
}

function updateMembers() {
  document.getElementById("usersConnectedOutput").innerHTML = "";
  var name = membersArray[0].clientData.username;
  var textnode = document.createTextNode(name);
  document.getElementById("usersConnectedOutput").appendChild(textnode);
  if (membersArray.length > 1) {
    for (var i = 1; i < membersArray.length; i++) {
      var name = membersArray[i].clientData.username;
      var textnode = document.createTextNode(", " + name);
      document.getElementById("usersConnectedOutput").appendChild(textnode);
    }
  }
}

function onMessage(message) {
  var data = message.data;
  switch (data.type) {
    case "question":
      onQuestion(message);
      break;
    case "answer":
      onAnswer(data);
      break;
    case "finalAnswer":
      onFinalAnswer(data);
      break;
    case "countdown":
      onCountdown(data);
      break;
    default:
      alert("Something broke! Recieved message without type!");
  }
}

function sendCountdown(secondsLeft) {
  var message = {
    type: "countdown",
    messageText: secondsLeft
  };
  drone.publish({
    room: room.name,
    message: message
  });
}

function onCountdown(data) {
  if (mode != "question") {
    countdownStarted = true;
    document.getElementById("countdownDiv").hidden = false;
    document.getElementById("secondsLeft").textContent = data.messageText;
    if (data.messageText >= 20)
      document.getElementById("secondsLeft").style.color = "green";
    if (data.messageText == 10)
      document.getElementById("secondsLeft").style.color = "yellow";
    if (data.messageText <= 5)
      document.getElementById("secondsLeft").style.color = "red";
    if (iAmTheServer()) {
      switch (data.messageText) {
        case 30:
          setTimeout(() => {
            sendCountdown(20);
          }, 10000);
          break;
        case 20:
          setTimeout(() => {
            sendCountdown(10);
          }, 10000);
          break;
        case 10:
          setTimeout(() => {
            sendCountdown(5);
          }, 5000);
          break;
        case 5:
          setTimeout(() => {
            sendCountdown(4);
          }, 1000);
          break;
        case 4:
          setTimeout(() => {
            sendCountdown(3);
          }, 1000);
          break;
        case 3:
          setTimeout(() => {
            sendCountdown(2);
          }, 1000);
          break;
        case 2:
          setTimeout(() => {
            sendCountdown(1);
          }, 1000);
          break;
        case 1:
          setTimeout(() => {
            sendCountdown(0);
          }, 1000);
          break;
        case 0:
          determineFinalAnswer();
          break;
        default:
          alert("something broke! Recieved countdown message with nonstandard count!");
      }
    }
  }
}

function onQuestion(message) {
  var data = message.data;
  var Pnode = document.createElement("P");
  var Strongnode = document.createElement("Strong");
  var fromUser = message.member.clientData.username;
  var textnode = document.createTextNode(fromUser + "'s Question:\xa0\xa0");
  Strongnode.appendChild(textnode);
  Pnode.appendChild(Strongnode);
  var textnode = document.createTextNode(data.messageText);
  Pnode.appendChild(textnode);
  document.getElementById("questionsAndAnswers").appendChild(Pnode);

  var questionText = data.messageText;
  document.getElementById("currentQuestion").textContent = questionText;

  if (isYesOrNoQuestion(questionText)) {
    document.getElementById("yesNoControls").hidden = false;
  } else if (isNumericQuestion(questionText)) {
    document.getElementById("answerField").placeholder = "Custom Answer/Value";
    document.getElementById("numericControls").hidden = false;
  }

  var elem = document.getElementById('questionsAndAnswers');
  elem.scrollTop = elem.scrollHeight;

  mode = "answer";
  onNewMode();
}

function isYesOrNoQuestion(questionText) {
  var lowerQuestionText = questionText.toLowerCase();
  if (
    lowerQuestionText.substring(0, 2) == "am" ||
    lowerQuestionText.substring(0, 2) == "is" ||
    lowerQuestionText.substring(0, 2) == "do" ||
    lowerQuestionText.substring(0, 3) == "are" ||
    lowerQuestionText.substring(0, 3) == "can" ||
    lowerQuestionText.substring(0, 3) == "did" ||
    lowerQuestionText.substring(0, 3) == "has" ||
    lowerQuestionText.substring(0, 3) == "may" ||
    lowerQuestionText.substring(0, 3) == "was" ||
    lowerQuestionText.substring(0, 4) == "does" ||
    lowerQuestionText.substring(0, 4) == "have" ||
    lowerQuestionText.substring(0, 4) == "were" ||
    lowerQuestionText.substring(0, 4) == "will" ||
    lowerQuestionText.substring(0, 5) == "could" ||
    lowerQuestionText.substring(0, 5) == "would" ||
    lowerQuestionText.substring(0, 6) == "should"
  ) {
    return true;
  }
  return false;
}

function isNumericQuestion(questionText) {
  var lowerQuestionText = questionText.toLowerCase();
  if (
    lowerQuestionText.substring(0, 7) == "how few" ||
    lowerQuestionText.substring(0, 8) == "how many" ||
    lowerQuestionText.substring(0, 8) == "how much"
  ) {
    return true;
  }
  return false;
}

function onAnswer(data) {
  if (iAmTheServer()) {
    if (data.messageText != "abstain") {
      answers.push(data.messageText);
      if (answers.length > 0 && membersArray.length > 1 && !countdownStarted) {
        if (isYesOrNoQuestion(document.getElementById("currentQuestion").textContent)) {
          sendCountdown(10);
        } else if (isNumericQuestion(document.getElementById("currentQuestion").textContent)) {
          sendCountdown(20);
        } else {
          sendCountdown(30);
        }
      }
    } else {
      abstains += 1;
    }
    if (membersArray.length <= 1 || (answers.length + abstains) == membersArray.length) {
      determineFinalAnswer();
      return;
    }
  }
}

function determineFinalAnswer() {
  if (answers.length > 0) {
    sendFinalAnswer(answers[randomIntFromInterval(0, answers.length - 1)]);
  } else {
    sendFinalAnswer("No Answer");
  }
}

function iAmTheServer() {
  usernames = [];
  for (var i = 0; i < membersArray.length; i++) {
    usernames.push(membersArray[i].clientData.username);
  }
  usernames.sort();
  if (usernames[0] == username) {
    return true;
  }
  return false;
}

function onFinalAnswer(data) {
  var Pnode = document.createElement("P");
  var Strongnode = document.createElement("Strong");
  var textnode = document.createTextNode("Answer:\xa0\xa0");
  Strongnode.appendChild(textnode);
  Pnode.appendChild(Strongnode);
  var textnode = document.createTextNode(data.messageText);
  Pnode.appendChild(textnode);
  document.getElementById("questionsAndAnswers").appendChild(Pnode);

  document.getElementById("currentQuestion").textContent = "---none---";

  var elem = document.getElementById('questionsAndAnswers');
  elem.scrollTop = elem.scrollHeight;

  mode = "question";
  onNewMode();
}

function sendQuestion() {
  questionText = document.getElementById("questionField").value;
  if (questionText.length >= 8) {
    if (questionText.charAt(questionText.length - 1) != '?') {
      questionText = questionText.concat("?");
    }
    var message = {
      type: "question",
      messageText: questionText
    };
    drone.publish({
      room: room.name,
      message: message
    });
    document.getElementById("questionField").value = "";
  } else {
    document.getElementById("8characterMin").hidden = false;
  }
}

function sendAnswer() {
  if (document.getElementById("answerField").value == "")
    document.getElementById("answerField").value = "abstain";
  var message = {
    type: "answer",
    messageText: document.getElementById("answerField").value
  };
  drone.publish({
    room: room.name,
    message: message
  });
  document.getElementById("answerOutput").textContent = document.getElementById("answerField").value;
  document.getElementById("answerField").value = "";
  mode = "noQuestion";
  onNewMode();
}


function sendFinalAnswer(text) {
  var message = {
    type: "finalAnswer",
    messageText: text
  };
  drone.publish({
    room: room.name,
    message: message
  });
}

function onNewMode() {
  if (mode == "question") {
    disableAnswerControls();
    countdownStarted = false;
    document.getElementById("logColumn").style.border = "1px green solid";
    document.getElementById("countdownDiv").hidden = true;
    document.getElementById("answerRecieved").hidden = true;
    document.getElementById("answerOutput").textContent = "";
    document.getElementById("questionField").disabled = false;
    document.getElementById("questionEnterButton").disabled = false;
    document.getElementById("questionField").focus();
    answers = [];
    abstains = 0;
  } else if (mode == "answer") {
    ding();
    disableQuestionControls();
    document.getElementById("8characterMin").hidden = true;
    document.getElementById("controlsColumn").style.border = "1px green solid";
    document.getElementById("controlsDiv").hidden = false;
    document.getElementById("answerField").disabled = false;
    document.getElementById("answerEnterButton").disabled = false;
    document.getElementById("abstainButton").disabled = false;
    document.getElementById("answerField").focus();
  } else if (mode == "noQuestion") {
    document.getElementById("answerRecieved").hidden = false;
    disableAnswerControls();
    disableQuestionControls();
  } else {
    disableAnswerControls();
    disableQuestionControls();
  }
}

function disableAnswerControls() {
  document.getElementById("controlsColumn").style.border = "1px #bdbdbd solid";
  document.getElementById("controlsDiv").hidden = true;
  document.getElementById("answerField").disabled = true;
  document.getElementById("answerEnterButton").disabled = true;
  document.getElementById("abstainButton").disabled = true;
  document.getElementById("yesNoControls").hidden = true;
  document.getElementById("numericControls").hidden = true;
  document.getElementById("answerField").placeholder = "Custom Answer";
}

function disableQuestionControls() {
  document.getElementById("logColumn").style.border = "1px #bdbdbd solid";
  document.getElementById("questionField").disabled = true;
  document.getElementById("questionEnterButton").disabled = true;
}

function onExtraButton(code) {
  var answerField = document.getElementById("answerField");
  switch (code) {
    case "Yes":
      answerField.value = "Yes";
      break;
    case "No":
      answerField.value = "No";
      break;
    case "Coin Flip":
      if (randomIntFromInterval(0, 1)) {
        answerField.value = "Yes";
      } else {
        answerField.value = "No";
      }
      break;
    case "Zeronone":
      answerField.value = "0";
      break;
    case "One":
      answerField.value = "1";
      break;
    case "Percentile Dice":
      var tensValue = randomIntFromInterval(0, 9) * 10;
      var onesValue = randomIntFromInterval(0, 9);
      var value = tensValue + onesValue;
      if (value == 0)
        value = 100;
      answerField.value = value;
      break;
    case "Between":
      answerField.value = randomIntFromInterval(
        document.getElementById("minField").value,
        document.getElementById("maxField").value
      );
      break;
    case "Roll":
      var sum = 0;
      var number = document.getElementById("numberDiceField").value;
      var diceType = document.getElementById("diceTypeField").value;
      for (var i = 0; i < number; i++) {
        sum += randomIntFromInterval(1, diceType);
      }
      answerField.value = sum;
      break;
    case "Abstain":
    default:
      answerField.value = "abstain";
  }
  sendAnswer();
}

function randomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

document.addEventListener('keyup', (e) => {
  if (e.code === "Enter") {
    if (mode == "notConnected") {
      joinRoom();
    } else if (mode == "question") {
      sendQuestion();
    } else {
      sendAnswer();
    }
  }
});

function infobox() {
  alert(
    "Questions beginning with \"How many\", \"How much\", or \"How few\", will allow the question to be answered using the numeric controls.\n\n" +
    "If you wish to ask a numeric question with a unit attached, phrase your question like \"How many miles is it?\" rather than \"How far is it?\"\n\n" +
    "Asking a yes or no question will allow the question to be answered using the yes or no controls."
  );
}

function ding() {
  var mp3Source = '<source src="ding.mp3" type="audio/mpeg">';
  var embedSource = '<embed hidden="true" autostart="true" loop="false" src="ding.mp3">';
  document.getElementById("sound").innerHTML = '<audio autoplay="autoplay">' + mp3Source + embedSource + '</audio>';
}
