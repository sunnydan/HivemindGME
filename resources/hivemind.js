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

function determineFinalAnswer() {
  if (answers.length > 0) {
    sendFinalAnswer(answers[randomIntFromInterval(0, answers.length - 1)]);
  } else {
    sendFinalAnswer("No Answer");
  }
}

function ding() {
  var mp3Source = '<source src="resources/ding.mp3" type="audio/mpeg">';
  var embedSource = '<embed hidden="true" autostart="true" loop="false" src="ding.mp3">';
  document.getElementById("sound").innerHTML = '<audio autoplay="autoplay">' + mp3Source + embedSource + '</audio>';
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

function infobox() {
  alert(
    "Questions beginning with \"How many\", \"How much\", or \"How few\", will allow the question to be answered using the numeric controls.\n\n" +
    "If you wish to ask a numeric question with a unit attached, phrase your question like \"How many miles is it?\" rather than \"How far is it?\"\n\n" +
    "Asking a yes or no question will allow the question to be answered using the yes or no controls."
  );
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

function joinRoom() {
  var validJoin = true;
  if (document.getElementById("userNameField").value == "") {
    document.getElementById("userNameField").classList.add("invalid");
    validJoin = false;
  }
  if (document.getElementById("roomNameField").value == "") {
    document.getElementById("roomNameField").classList.add("invalid");
    validJoin = false;
  }
  if (validJoin) {
    document.getElementById("roomNameField").classList.remove("invalid");
    document.getElementById("userNameField").classList.remove("invalid");

    drone = new ScaleDrone(channel_id, {
      data: {
        username: document.getElementById("userNameField").value,
      }
    });

    username = document.getElementById("userNameField").value;
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
      document.getElementById("usersConnectedRow").hidden = false;
      document.getElementById("usersConnectedRow").style.removeProperty('display');
      document.getElementById("roomNameOutput").textContent = "\"" + roomname + "\"";
      mode = "question";
      onNewMode();
    });
  }
}

function leaveRoom() {
  location.reload();
  // room.unsubscribe();
  // drone.close();
  // drone = null;
  // room = null;
  // username = null;
  // document.getElementById("questionsAndAnswers").innerHTML = "";
  // document.getElementById("roomNameField").value = ""
  // mode = "notConnected";
  // onNewMode();
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

function onCountdown(data) {
  if (mode != "question") {
    countdownStarted = true;
    var countdowns = document.getElementsByClassName("countdownSpan");
    var secondsLefts = document.getElementsByClassName("secondsLeft");
    for (var i = 0; i < countdowns.length; i++) {
      countdowns[i].hidden = false;
    }
    for (var i = 0; i < secondsLefts.length; i++) {
      secondsLefts[i].textContent = data.messageText;
    }
    if (data.messageText >= 20)
      for (var i = 0; i < secondsLefts.length; i++) {
        secondsLefts[i].style.color = "yellow";
      }
    if (data.messageText == 10)
      for (var i = 0; i < secondsLefts.length; i++) {
        secondsLefts[i].style.color = "orange";
      }
    if (data.messageText <= 5)
      for (var i = 0; i < secondsLefts.length; i++) {
        secondsLefts[i].style.color = "red";
      }
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

  mode = "question";
  onNewMode();
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

function onNewMode() {
  if (mode == "question") {
    scaleOutCardByID("logInCard");
    scaleOutCardByID("answerCard");
    scaleOutCardByID("givenAnswerCard");
    scaleInCardByID("logCard");
    scaleInCardByID("questionCard");

    countdownStarted = false;
    var countdowns = document.getElementsByClassName("countdownSpan");
    for (var i = 0; i < countdowns.length; i++) {
      countdowns[i].hidden = true;
    }

    document.getElementById("yesNoControls").hidden = true;
    document.getElementById("numericControls").hidden = true;
    document.getElementById("answerField").placeholder = "Custom Answer";
    document.getElementById("questionField").focus();

    var top = document.getElementById('questionField').documentOffsetTop() - (window.innerHeight / 2);
    window.scrollTo(0, top);

    var elem = document.getElementById('questionsAndAnswers');
    elem.scrollTop = elem.scrollHeight;

    answers = [];
    abstains = 0;
  } else if (mode == "answer") {
    ding();
    scaleOutCardByID("logCard");
    scaleOutCardByID("questionCard");
    scaleInCardByID("answerCard");
    document.getElementById("answerField").focus();
    window.scrollTo(0, 0);
  } else if (mode == "noQuestion") {
    scaleOutCardByID("answerCard");
    scaleInCardByID("givenAnswerCard");
  } else {}
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
    console.log("make yesno vis");
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

function randomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function scaleInCardByID(cardID) {
  var card = document.getElementById(cardID);
  card.hidden = false;
  setTimeout(() => {
    card.classList.remove("scale-out");
    card.classList.add("scale-in");
  }, 200);
}

function scaleOutCardByID(cardID) {
  var card = document.getElementById(cardID);
  card.classList.remove("scale-in");
  card.classList.add("scale-out");
  setTimeout(() => {
    card.hidden = true;
  }, 200);
}

function scaleToggleCardByID(cardID) {
  var card = document.getElementById(cardID);
  if (card.hidden != true) { //if the card is showing
    scaleOutCardByID(card.id);
  } else { //if the card is not showing, ergo: if hidden is true
    scaleInCardByID(card.id);
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

function sendQuestion() {
  questionText = document.getElementById("questionField").value;
  if (questionText.length >= 8) {
    document.getElementById("questionField").classList.remove("invalid");
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
    document.getElementById("questionField").classList.add("invalid");
  }
}

function updateMembers() {
  if (membersArray.length > 0) {
    document.getElementById("usersConnectedRow").hidden = false;
  } else {
    document.getElementById("usersConnectedOutput").hidden = true;
  }
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

document.getElementById("logCard").hidden = true;
document.getElementById("questionCard").hidden = true;
document.getElementById("answerCard").hidden = true;
document.getElementById("yesNoControls").hidden = true;
document.getElementById("numericControls").hidden = true;
document.getElementById("usersConnectedRow").hidden = true;
document.getElementById("usersConnectedRow").style.display = "none !important";

Element.prototype.documentOffsetTop = function() {
  return this.offsetTop + (this.offsetParent ? this.offsetParent.documentOffsetTop() : 0);
};
