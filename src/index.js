var Alexa = require('alexa-sdk');
var AWS = require('aws-sdk');
var moment = require("moment");
var fs = require("fs");
var csv = require('csvtojson')
var _ = require("lodash");
moment.locale('de');

var s3 = new AWS.S3();
var params = {
    Bucket: 'alexa-skill-bucket',
    Key: 'birthday.csv'
};
//Replace with your app ID .  You can find this value at the top of your skill's page on http://developer.amazon.com.  
//Make sure to enclose your value in quotes, like this: var APP_ID = "amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1";
var APP_ID = undefined;

var SKILL_NAME = "Geburtstagskalender";
var HELP_MESSAGE = "Frag mich einfach wer hat die Geburtstage in die gewünschte Zeit";
var HELP_REPROMPT = "Was kann ich für dich machen?";



exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.emit(":ask", "Hallo, willkomen bei  Geburtstagskalender, frag mich nach Geburstdaten von deine PixelPark Kollegen ");
    },
    'getBirthday': function () {
        var date, timeGiven, callendar, speechOutput, dateString,people = [];
        timeGiven = _.has(this.event.request.intent.slots.Zeit, "value");

        if (timeGiven) {
            ZeitSlotValue = this.event.request.intent.slots.Zeit.value;
            date = moment(ZeitSlotValue).format("MM");
            dateString = moment(ZeitSlotValue).format("MMMM")
        } else {
            date = moment().format("MM");
        }

        readData().then((res) => {
            this.emit(":askWithCard", res, "Du kannst mir weiter Fragen stellen", SKILL_NAME, res)
        });


        function readData() {
            return new Promise(function (resolve, reject) {
                s3.getObject(params, function (err, data) {
                    // Looking up the data csv table from file 
                    var dataset = data.Body.toString();
                    csv()
                        .fromString(dataset)
                        .on('csv', (rowArray) => {
                            try {
                                let bday = moment(rowArray[1], "DD-MM").format("MM");
                                if (bday == date) {
                                    people.push(rowArray[0])
                                }
                            } catch (e) {
                                console.log(e);
                            }
                        })
                        .on('done', (error) => {
                            console.log(error)
                            response = formatResponse(speechOutput, people, false)
                            resolve(response)
                        })
                });
            });
        }

        function formatResponse(speechOutput, people, fullName) {
            speechOutput = "Kollegen die im " + dateString + " geburtstag haben sind: "
            let ctr = 1
            _.each(people, (elem) => {
                if (ctr != people.length) {
                    speechOutput += fullName ? elem+", " : elem.split(" ")[0] + ", ";
                } else {
                    speechOutput += " und " + (fullName ? elem+", " : elem.split(" ")[0] + ", ");
                }
                ctr++;
            });
            return speechOutput;
        }
    },



    'AMAZON.HelpIntent': function () {
        var speechOutput = HELP_MESSAGE;
        var reprompt = HELP_REPROMPT;
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        var STOP_MESSAGE = "Tschüssi!";
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        var STOP_MESSAGE = "Tschüssi!";
        this.emit(':tell', STOP_MESSAGE);
    },

    // 
    "playSong":function(){
        var audioData = [
            {
                'title' : 'Happy Birthday ',
                'url' : 'https://raw.githubusercontent.com/gniewus/Geburtstagkallendar/master/geburtstag.mp3'
            }];

            var response = {
                version: "1.0",
                response: {
                    shouldEndSession: true,
                    directives: [
                        {
                            type: "AudioPlayer.Play",
                            playBehavior: "REPLACE_ALL", // Setting to REPLACE_ALL means that this track will start playing immediately
                            audioItem: {
                                stream: {
                                    url: audioData.url,
                                    //token: "0", // Unique token for the track - needed when queueing multiple tracks
                                   // expectedPreviousToken: null, // The expected previous token - when using queues, ensures safety
                                }
                            }
                        }
                    ]
                }
            };

            this.context.succeed(response);

    },
};