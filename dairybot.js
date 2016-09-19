/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
              _____         _           ____        _
             |  __  \      (_)         |  _ \      | |
             | |  | | __ _ _ _ __ _   _| |_) | ___ | |_
             | |  | |/ _` | | '__| | | |  _ < / _ \| __|
             | |__| | (_| | | |  | |_| | |_) | (_) | |_
             |_____/ \__,_|_|_|   \__, |____/ \___/ \__|
                                  __/ |
                                 |___/
               The ChatBot that makes your team happy !
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


if (!process.env.DairyBotToken) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}
if (!process.env.DairyBotConfig) {
    process.env.DairyBotConfig="dairybot.json";
}

var Botkit = require('botkit');
var os = require('os');
var util = require('util');
var fs = require('fs');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var exphbs  = require('express-handlebars');

/**
 * check /persist/db and /persist/logs
 */
if (!fs.existsSync("./persist")){
    fs.mkdirSync("./persist");
}
if (!fs.existsSync("./persist/db")){
    fs.mkdirSync("./persist/db");
}
if (!fs.existsSync("./persist/logs")){
    fs.mkdirSync("./persist/logs");
}

/**
 * load dairyBot configuration
 **/
var dairyConf = require('./config/'+process.env.DairyBotConfig);

/**
 * localisation
 */
String.prototype.__ = function (toreplace) {
    if (typeof dairyConf.str[this] === "string") {
        if (typeof toreplace === "object") {
            return dairyConf.str[this].replaceArray(toreplace);
        } else {
            return dairyConf.str[this];
        }
    } else {
        if (typeof toreplace === "object") {
            return this.replaceArray(toreplace);
        } else {
            return this;
        }
    }
}
String.prototype.__n = function (numb, toreplace) {
    if (typeof toreplace === "undefined" ) {
        var toreplace = {};
    }
    toreplace.numb = numb;
    if (typeof dairyConf.str[this] === "object") {
        if (numb > 1) {
            if (typeof dairyConf.str[this].multi === "string") {
                return dairyConf.str[this].multi.__(toreplace);
            } else {
                return this.__(toreplace); //fallback, generaly wrong
            }
        } else {
            if (typeof dairyConf.str[this].one === "string") {
                return dairyConf.str[this].one.__(toreplace);
            } else {
                return this.__(toreplace);
            }
        }
    } else {
        return this.__(toreplace);
    }
}
String.prototype.replaceArray = function(findreplace) {
    var replaceString = this;
    for(var index in findreplace) {
        replaceString = replaceString.replace("{"+index+"}", findreplace[index]);
    }
    return replaceString;
};

/**
 * csv log file for reward history
 */
var today = new Date();
var csv_log_file = fs.createWriteStream('./logs/dairyRewards-'+today.getFullYear()+'-'+(today.getMonth()+1)+'.log.csv', {flags : 'a'});
var csv_log_file_month = today.getMonth()+1;
csvlog = function() { //write all argument separated by ';' for a csv file
    now = new Date();
    args = Array.prototype.slice.call(arguments);
    csv_log_file.write(now.toISOString() + ';' + args.join(';') + '\n');
};

/**
 * Start BOT
 */
var controller = Botkit.slackbot({
    debug: false,
    json_file_store: 'db'
});
var bot = controller.spawn({
    token: process.env.DairyBotToken
}).startRTM();

if (dairyConf.utterances) {
    bot.utterances.yes = new RegExp("^("+dairyConf.utterances.yes.join("|")+")","i");
    bot.utterances.no = new RegExp("^("+dairyConf.utterances.no.join("|")+")","i");
}

/**
 * Start http Server
 */
var app = express();
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    partialsDir: ['views/partials/']
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 3000);

/**
 *  /     => statics
 *  /top  => user top
 */
app.use('/top', function(req, res) {


    params = {  lists: userTop,
        rewardname : dairyConf.reward.name.multi
    };
    res.render('top', params);
});
app.use('/', function(req, res) {
    res.render('index', { title: 'Express' });
});
var server = app.listen(app.get('port'), function() {
    console.log('Dairybot stats availaible on http://' + server.address().port);
});

/**
 * Sort of Cron for DailyWork
 */
var nextCronDate = new Date();
nextCronDate.setHours(dairyConf.cronHourUTC, dairyConf.cronMinuteUTC, 0);
setInterval(function(){
    now = new Date();
    if (now>nextCronDate) {
        dairyEveryDay(); // update user list and give Gift
        nextCronDate.setDate(nextCronDate.getDate() + 1);
    }
},1000*05);

var channelName = [];
var userTop = [];

function dairyEveryDay() {
    // Change log file if necessary
    if (csv_log_file_month != today.getMonth()+1) {
        csv_log_file = fs.createWriteStream('./logs/dairyRewards-'+today.getFullYear()+'-'+(today.getMonth()+1)+'.log.csv', {flags : 'a'});
        csv_log_file_month = today.getMonth()+1;
    }

    // Look for user, set in DB and give points to give
    bot.api.users.list({}, function (err, res) {
        for (var member in res.members) {

            if (!res.members[member].is_restricted && !res.members[member].is_ultra_restricted && !res.members[member].is_ultra_restricted && !res.members[member].is_bot) {
                // if user exist, add reward else create user
                (function (m) {
                    controller.storage.users.get(res.members[m].id, function (err, user) {
                        if (!user) {
                            user = {
                                id: res.members[m].id,
                                gift: 0,
                                reward: 0,
                            };
                        }
                        user.name = res.members[m].name;
                        // is the user deleted ou exclude ?
                        user.excluded = false;
                        if ((res.members[m].deleted) ||
                            (dairyConf.restrictedToUser.length && dairyConf.restrictedToUser.indexOf(res.members[m].name) == -1) ||
                            (dairyConf.excludedUser.length && dairyConf.excludedUser.indexOf(res.members[m].name) != -1)
                        ) {
                            user.excluded = true;
                        }
                        // Set gift for the day (once a day)
                        if (!user.excluded) {
                            var today = new Date();
                            if (user.updateGiftDate != today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
                            &&  dairyConf.reward.excludedDays.indexOf(today.getDay())===-1) {
                                // update daily gift counter
                                giftGiven = 0;
                                if (user.gift + dairyConf.reward.recognitionByDay <= dairyConf.reward.recognitionMax) {
                                    user.gift = user.gift + dairyConf.reward.recognitionByDay;
                                    giftGiven = dairyConf.reward.recognitionByDay;
                                } else {
                                    user.gift = dairyConf.reward.recognitionMax;
                                    giftGiven = dairyConf.reward.recognitionMax - user.gift;
                                }
                                bot.api.chat.postMessage({
                                    'channel': user.id,
                                    'text': "Hello {user},\ntoday you've got {gifts} {giftEmoji} to reward your colleague. If you whant to know how many rewards you've got just tell me `hello`.".
                                        __({"user":user.name,"gifts":user.gift,"giftEmoji":dairyConf.reward.giftEmoji}),
                                    'as_user':true
                                },function(err, user) {
                                    console.log("new"+JSON.stringify(err, null, 4));
                                    console.log(JSON.stringify(user, null, 4));

                                });
                                user.updateGiftDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
                                csvlog(dairyConf.botName, giftGiven, user.name, "dairyEveryDay");
                            }
                        } else {
                            user.gift = 0;
                        }
                        controller.storage.users.save(user);
                    });
                })(member);

            }
        }
        if (err) {
            bot.botkit.log('Failed load users', err);
        }
    });
    // Update channels list
    bot.api.channels.list({}, function (err, res) {
        channelName = [];
        for (var channel in res.channels) {
            if (!res.channels[channel].is_archived) {
                // if user exist, add reward else create user
                (function (m) {
                    controller.storage.channels.get(res.channels[channel].id, function (err, c) {
                        if (!c) {
                            c = {
                                id: res.channels[m].id
                            };
                        }
                        c.name = res.channels[m].name;
                        c.num_members = res.channels[m].num_members;
                        channelName[c.id]=c.name;
                        // is the user deleted ou exclude ?
                        c.excluded = false;
                        if ((res.channels[m].is_archived) ||
                            (dairyConf.restrictedToUser.length && dairyConf.restrictedToChannel.indexOf(res.channels[m].name) == -1) ||
                            (dairyConf.excludedUser.length && dairyConf.excludedChannel.indexOf(res.channels[m].name) != -1)
                        ) {
                            c.excluded = true;
                        }

                        controller.storage.channels.save(c);
                    });
                })(channel);

            }
        }
    });
    //updateTop();
};

/**
 *  Monitor giveaways in each chanel the bot has been invited
 */
controller.hears(['.*'+dairyConf.reward.giftEmoji+'.*','.*'+dairyConf.reward.giftEmojiAlias+'.*'], 'ambient', function(bot, message) {
    console.log(JSON.stringify(message, null, 4));

    // check who is rewarded
    var reg = new RegExp('<@([A-Z0-9]+)>','g');
    var rewarded = [];
    while ((result = reg.exec(message.text)) !== null) {
        if (message.user != result[1]) {
            rewarded.push(result[1]);
        }
    };
    if (rewarded.length == 0) {
        bot.api.reactions.add({
            timestamp: message.ts,
            channel: message.channel,
            name: 'no_entry_sign',
        }, function(err, res) {
            if (err) {
                bot.botkit.log('Failed to add emoji reaction :(', err);
            }
        });
        return;
    }

    // check how many reward
    var reg2 = new RegExp(dairyConf.reward.giftEmoji,'g');
    var rewardcount = (message.text.match(reg2) || []).length;
    // have we an alias with :thanks"
    if (dairyConf.reward.giftEmoji!=dairyConf.reward.giftEmojiAlias) {
        var reg3 = new RegExp(dairyConf.reward.giftEmojiAlias,'g');
        rewardcount = rewardcount + (message.text.match(reg3) || []).length;
    }

    // check if user have enough credit to give
    (function(rcount, rlist) {
        controller.storage.users.get(message.user, function(err, user) {
            if (user && typeof user.gift != undefined && user.gift>=(rcount*rlist.length)) {
                //bot.reply(message, rewardcount*rewarded.length + ' gift donnée');
                bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: dairyConf.giftHeardEmoji,
                }, function(err, res) {
                    if (err) {
                        bot.botkit.log('Failed to add emoji reaction :(', err);
                    }
                });
                // remove reward
                user.gift = user.gift - (rcount*rlist.length);
                var namelist = "";
                var giverID=user.id;
                var giverName=user.name;
                controller.storage.users.save(user, function(err,user) {
                    // give reward and warn rewarded
                    for (var who in rlist) {
                        namelist = namelist + '<@' + rlist[who] + '>' + ' ';
                        console.log("namelist : "+namelist);
                        controller.storage.users.get(rlist[who], function (err, rewarded) {
                            // only to active user
                            bot.api.chat.postMessage({
                                'channel': rlist[who],
                                'text': "You received {somerewards} from {giver}.".__({"somerewards":rcount + ' ' + dairyConf.reward.rewardEmoji, "giver": giverID}),
                                'as_user':true
                            });
                            rewarded.reward = rewarded.reward + rcount;
                            controller.storage.users.save(rewarded);
                            canBeReward(rewarded);
                            csvlog(giverName, rcount, rewarded.name, channelName[message.channel]);
                        });
                    }
                    // confirm giver
                    bot.api.chat.postMessage({
                        'channel': giverID ,
                        'text': "You gave {someeggs} to {rewarded}".__({"someeggs":(rcount*rlist.length) + ' ' + dairyConf.reward.rewardEmoji, "rewarded":namelist }),
                        'as_user':true
                    });
                    //bot.reply(message, "Giver "+rcount*rlist.length + ' ' + dairyConf.reward.rewardEmoji + ' à ' + namelist + 'par <@'+user.id+'>');
                });
            } else {
                // Fail to reward
                bot.api.chat.postMessage({
                    'channel':user.id,
                    'text':  "Sorry, you didn't have enough {egg}, you need {eggs}.".__({"egg":dairyConf.reward.giftEmoji,"eggs":rewardcount*rewarded.length + ' ' + dairyConf.reward.giftEmoji}),
                    'as_user':true
                });
                bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: 'no_entry_sign',
                }, function(err, res) {
                    if (err) {
                        bot.botkit.log('Failed to add emoji reaction :(', err);
                    }
                });
            }
        });
    })(rewardcount, rewarded);
});

/**
 *  Direct message commands
 */
controller.hears(['hello', 'hi', 'hello'.__(), 'hi'.__()], 'direct_message', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: dairyConf.giftHeardEmoji,
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });

    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            msgTxt = "Hello {name}!\n".__({'name':user.name });
            if ( user.gift > 0) {
                msgTxt = msgTxt + "You have {rewards} to give today.\n".__({'rewards':user.gift+' '+dairyConf.reward.giftEmoji});
            } else {
                msgTxt = msgTxt + "You don't have {rewards} to give today. See you tomorow!\n".__({'rewards':dairyConf.reward.giftEmoji});
            }
            if ( user.reward > 0) {
                msgTxt = msgTxt +  "You have received {rewards}.".__({"rewards":user.reward+' '+dairyConf.reward.rewardEmoji});
            } else {
                msgTxt = msgTxt +  "You haven't already received {rewards}.".__({"rewards":dairyConf.reward.rewardEmoji});
            }
            bot.reply(message, msgTxt);
            canBeReward(user);
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

controller.hears(['use', 'use'.__()], 'direct_message', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: dairyConf.giftHeardEmoji,
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            giftList = rewardList(user);
            if (giftList.length > 1) {
                bot.startConversation(message, function(err, convo) {
                    var nums = [];
                    for (i = 1; i <= giftList.length; i++) {
                        nums.push(i);
                    }
                    numslist = new RegExp("[1-"+ nums.length +"]", 'i');
                    // Need to choose wich gift
                    convo.ask({
                        'text': "Which gift do you want ? ({giftlist})".__({"giftlist":nums.join(', ')}),
                        'as_user': true,
                        "attachments": giftList
                    }, [
                        {
                            pattern: numslist,
                            callback: function (response, convo) {
                                var giftChoosen = response.text-1;
                                giveReward (convo, response.user, giftList[giftChoosen]);
                                convo.next();
                            }
                        },
                        {
                            pattern: bot.utterances.no,
                            callback: function (response, convo) {
                                convo.say('To bad!'.__());
                                convo.next();
                            }
                        },
                        {
                            default: true,
                            callback: function (response, convo) {
                                // just repeat the question
                                convo.say("Sorry, I did not undersant".__());
                                convo.repeat();
                                convo.next();
                            }
                        }
                    ]);
                });
            } else if (giftList.length === 1) {
                bot.startConversation(message, function(err, convo) {
                    // Just need to confirm
                    convo.ask({
                        'text': "Do you want this gift ?".__(),
                        'as_user':true,
                        "attachments": giftList
                    }, [
                        {
                            pattern: bot.utterances.yes,
                            callback: function(response, convo) {
                                giveReward (convo, response.user, giftList[0]);
                                convo.next();
                            }
                        },
                        {
                            pattern: bot.utterances.no,
                            callback: function(response, convo) {
                                convo.say('Too bad!'.__());
                                convo.next();
                            }
                        },
                        {
                            default: true,
                            callback: function (response, convo) {
                                // just repeat the question
                                convo.say("Sorry, I did not undersant".__());
                                convo.repeat();
                                convo.next();
                            }
                        }
                    ]);
                });
            } else {
                bot.reply(message, "You've got enought {rewards} to have something".__());
            }

        } else {
            bot.reply(message, "Nothing for you".__());
        }
    });
    //updateTop();
});

controller.hears(['restart'], 'direct_message', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to restart?'.__(), [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('See you!'.__());
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say("*"+'Phew!'.__()+"*");
                convo.next();
            }
        }
        ]);
    });
});

controller.hears(['uptime'], 'direct_message,', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':'+dairyConf.giftHeardEmoji+': I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + ".\n"+
                "Configuration : "+process.env.DairyBotConfig
        );
    });

/**
 *  Functions
 */
function canBeReward (user) {
    msg = {
        'channel':user.id,
        'text': "You can have a reward : just tell me `use`".__(),
        'as_user':true,
        "attachments": rewardList(user)
    };
    if (msg.attachments.length>0) {
        bot.api.chat.postMessage(msg);
    }
}

function giveReward (convo, userId, gift) {
    // remove point from customer
    controller.storage.users.get(userId, function (err, user) {
        // log reward
        csvlog(user.name, dairyConf.reward.rewardRL[gift.realid].cost, dairyConf.botName , "useReward");
        // remove cost
        user.reward = user.reward - dairyConf.reward.rewardRL[gift.realid].cost;
        controller.storage.users.save(user);
        // Confirm user
        convo.say({
            'text': "Done!".__()  + ' ' + dairyConf.reward.rewardRL[gift.realid].getinfo,
            'as_user': true,
            "attachments": [gift]
        });
        // Post confirmation in admin channel
        bot.api.chat.postMessage({
            'channel': dairyConf.adminChanel,
            'text': "<@{user}> ask a gift: ".__({"user":user.id}),
            "attachments": [gift],
            'as_user':true
        },function(err, user) {
            console.log("Error : "+JSON.stringify(err, null, 4));
            console.log(JSON.stringify(user, null, 4));
        });
    });
    //updateTop();
}

function rewardList (user) {
    var attachs = [];
    var line =1;
    for (var rewardKey in dairyConf.reward.rewardRL) {
        if (user.reward >= dairyConf.reward.rewardRL[rewardKey].cost) {
            attachs.push({
                "fallback": dairyConf.reward.rewardRL[rewardKey].desc,
                "color": dairyConf.reward.rewardRL[rewardKey].color,
                "title": "#" + line + " : " + dairyConf.reward.rewardRL[rewardKey].desc,
                "thumb_url": dairyConf.reward.rewardRL[rewardKey].thumb_url,
                "text": "Value:".__() + dairyConf.reward.rewardRL[rewardKey].cost + " " + dairyConf.reward.rewardEmoji,
                "realid" : rewardKey
            });
            line++;
        }
    }
    return attachs;
}

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

function updateTop() {
    controller.storage.users.all( function(err,res){
        userTop = [];
        for ( var id in res ) {
            if ( !res[id].excluded ) {
                userTop.push({name: res[id].name, reward : res[id].reward});
            }
        }
        userTop.sort(function(a, b){return a-b});
        for ( var id in top ) {
            console.log(userTop[id].name + " : " + tuserTopop[id].reward);
        }
    });
}
