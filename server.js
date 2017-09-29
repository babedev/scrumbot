let SparkBot = require("node-sparkbot")
let bot = new SparkBot()
let SparkAPIWrapper = require("node-sparkclient")
let spark = new SparkAPIWrapper(process.env.SPARK_TOKEN)
let axios = require('axios')

var actionStates = {}
var reports = {}

bot.onMessage((trigger, message) => {
    if (message.personEmail != 'scrumme@sparkbot.io') {
        if (message.text == '/scrum') {
            var command = bot.asCommand(message);
            if (command) {
                spark.createMessage(command.message.roomId, "Let's start Scrum\n\n**What did you accomplish yesterday?**", { "markdown":true }, (err, message) => {
                    if (!err) {
                        actionStates[command.message.personEmail] = 1
                        reports[command.message.personEmail] = {
                            userId: 2,
                            accomplishedTask: "",
                            isAchievedGoal: false,
                            goal: "",
                            obstacle: ""
                        }
                    }
                })
            }
        } else if (message.text == '/report') {
            var command = bot.asCommand(message);
            if (command) {
                axios.get('http://afc62129.ngrok.io/api/reports/summary')
                            .then((res) => {
                                 spark.createMessage(command.message.roomId, `**Participation** ${res.data.percentParticipation}%\n\n**Goal completion** ${res.data.percentAccomplished}%\n\n**Blocked** ${res.data.percentObstacle}%`, { "markdown":true }, (err, message) => {})
                            })
                            .catch((err) => {
                                console.log(err)
                            })
            }
        } else if ((message.text.includes("hi") || message.text.includes("hello") || message.text.includes("hey")) && message.text.includes("bot")) {
            console.log(`greet from ${message.personEmail}`)
            spark.createMessage(message.roomId, `Hello <@personEmail: ${message.personEmail}> :). How are you today?`, { "markdown":true }, (err, message) => {})
        } else {
            if (actionStates[trigger.data.personEmail] < 6) {
                actionStates[trigger.data.personEmail] += 1
                
                var title = ""
                
                switch(actionStates[trigger.data.personEmail]) {
                    case 2:
                        reports[trigger.data.personEmail].accomplishedTask = message.text
                        title = "**Did you meet yesterday's goals?**"
                        break;
                    case 3:
                        reports[trigger.data.personEmail].isAchievedGoal = message.text == 'yes' || message.text == 'yep'
                        title = "**What are your goals for today?**"
                        break;
                    case 4:
                        reports[trigger.data.personEmail].goal = message.text
                        title = "**Any obstacles impeding your progress?**"
                        break;
                    case 5:
                        if (message.text == 'no' || message.text == 'nope' || message.text == 'not') {
                            reports[trigger.data.personEmail].obstacle = ""
                        } else {
                            reports[trigger.data.personEmail].obstacle = message.text
                        }
                        
                        let currentDate = new Date()
                        title = `Thanks, <@personEmail: ${message.personEmail}>! You're checked in for ${currentDate.toString('MMM dd')}\n\nAccomplish: ${reports[trigger.data.personEmail].accomplishedTask}\n\nMet goal: ${reports[trigger.data.personEmail].isAchievedGoal}\n\nGoals: ${reports[trigger.data.personEmail].goal}\n\nObstacles: ${reports[trigger.data.personEmail].obstacle}\n`
                        
                        axios.post('http://afc62129.ngrok.io/api/reports/create', reports[trigger.data.personEmail])
                            .catch((err) => {
                                console.log(err)
                            })
                }
    
                spark.createMessage(message.roomId, title, { "markdown":true }, (err, message) => {})
            }
        }
    }
});

bot.onEvent("memberships", "created", function (trigger) {
    var newMembership = trigger.data;
    if (newMembership.personId != bot.interpreter.person.id) {
        console.log("new membership fired, but it is not us being added to a room. Ignoring...");
        return;
    }

    // so happy to join
    console.log("bot's just added to room: " + trigger.data.roomId);
    
    spark.createMessage(trigger.data.roomId, "Hi, I am the Hello World bot !\n\nType /hello to see me in action.", { "markdown":true }, function(err, message) {
        if (err) {
            console.log("WARNING: could not post Hello message to room: " + trigger.data.roomId);
            return;
        }

        if (message.roomType == "group") {
            spark.createMessage(trigger.data.roomId, "**Note that this is a 'Group' room. I will wake up only when mentionned.**", { "markdown":true }, function(err, message) {
                if (err) {
                    console.log("WARNING: could not post Mention message to room: " + trigger.data.roomId);
                    return;
                }
            })
        }      
    }) 
})

