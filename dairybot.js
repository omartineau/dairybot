/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  _____         _           ____        _
 |  __  \      (_)         |  _ \      | |
 | |  | | __ _ _ _ __ _   _| |_) | ___ | |_
 | |  | |/ _` | | '__| | | |  _ < / _ \| __|
 | |__| | (_| | | |  | |_| | |_) | (_) | |_
 |_____/ \__,_|_|_|   \__, |____/ \___/ \__|
                      __/ |
                     |___/
   The ChatBot that make your team happy !
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}
if (!process.env.config) {
    process.env.config="dairybot.json";
}

var Botkit = require('botkit');
var os = require('os');
var util = require('util');
var fs = require('fs');



// csv log file for reward history
var today = new Date();
var csv_log_file = fs.createWriteStream('./logs/dairyRewards-'+today.getFullYear()+'-'+(today.getMonth()+1)+'.log.csv', {flags : 'a'});
csvlog = function() { //write all argument separated by ';' for a csv file
    now = new Date();
    args = Array.prototype.slice.call(arguments);
    csv_log_file.write(now.toISOString() + ';' + args.join(';') + '\n');
};

// load configuration
var dairyConf = require('./config/'+process.env.config);

var controller = Botkit.slackbot({
    debug: false,
    json_file_store: 'db'
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();


// Sort of Cron for DailyWork
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

function dairyEveryDay() {
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
                                if (user.gift + dairyConf.reward.dairyConf <= dairyConf.reward.giftMax) {
                                    user.gift = user.gift + dairyConf.reward.dairyConf;
                                    giftGiven = dairyConf.reward.dairyConf;
                                } else {
                                    giftGiven = dairyConf.reward.giftMax - user.gift;
                                    user.gift = dairyConf.reward.giftMax;
                                }
                                bot.api.chat.postMessage({
                                    'channel': user.id,
                                    'text':'Bonjour '+user.name+",\n"+'aujourd\'hui tu as '+user.gift+' '+dairyConf.reward.giftEmoji+' a donner pour remercier tes collègues. Si tu veux savoir où tu en es, dis moi juste "bonjour".',
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
};

controller.hears(['hello', 'hi', 'bonjour'], 'direct_message', function(bot, message) {

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
            msgTxt = 'Hello ' + user.name + ' !\n';
            if ( user.gift > 0) {
                msgTxt = msgTxt + 'Tu as  ' + user.gift+' '+dairyConf.reward.giftEmoji+' a donner aujourd\'hui.\n';
            } else {
                msgTxt = msgTxt + 'Tu n\'as plus de  ' + dairyConf.reward.giftEmoji+' a donner aujourd\'hui. Rendez-vous demain !\n';
            }
            if ( user.reward > 0) {
                msgTxt = msgTxt +  'Tu as reçu  ' + user.reward+' '+dairyConf.reward.rewardEmoji+'.';
            } else {
                msgTxt = msgTxt +  'Tu n\'as pas encore reçu  de '+dairyConf.reward.rewardEmoji+'.';
            }
            bot.reply(message, msgTxt);
            canBeReward(user);
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

controller.hears(['use', 'utiliser'], 'direct_message', function(bot, message) {

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
            bot.reply(message, 'Quand <@olivier> aura fini, tu pourras récupérer ton cadeau.');
        } else {
            bot.reply(message, 'Je n\'ai rien pour toi.');
        }
    });
});

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
            if (user && typeof user.gift != undefined && user.gift>=rcount) {
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
                                'text':'<@' + giverID + '> t\'a donné '+ rcount + ' ' + dairyConf.reward.rewardEmoji+'.',
                                'as_user':true
                            });
                            //bot.reply(message, "Rewarded " + rcount + ' ' + dairyConf.reward.rewardEmoji + ' à <@' + rlist[who] + '> par <' + user.id + '>');
                            rewarded.reward = rewarded.reward + rcount;
                            controller.storage.users.save(rewarded);
                            canBeReward(rewarded);
                            csvlog(giverName, rcount, rewarded.name, channelName[message.channel]);
                        });
                    }
                    // confirm giver
                    bot.api.chat.postMessage({
                        'channel': giverID ,
                        'text':'Tu as donné '+ (rcount*rlist.length) + ' ' + dairyConf.reward.rewardEmoji + ' à ' + namelist+'.',
                        'as_user':true
                    });
                    //bot.reply(message, "Giver "+rcount*rlist.length + ' ' + dairyConf.reward.rewardEmoji + ' à ' + namelist + 'par <@'+user.id+'>');
                });
            } else {
                // Fail to reward
                bot.api.chat.postMessage({
                    'channel':user.id,
                    'text':rewardcount*rewarded.length + ' ' + dairyConf.reward.giftEmoji + ' a donner, mais pas assez en stock',
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


controller.hears(['restart'], 'direct_message', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to restart?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('See you!');
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
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':'+dairyConf.giftHeardEmoji+': I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');
    });

function canBeReward (user) {
    canReward = false;
    msgTxt = "";
    for (var rewardKey in dairyConf.reward.rewardRL) {
        if (user.reward >= dairyConf.reward.rewardRL[rewardKey].cost) {
            msgTxt = msgTxt +'*'+dairyConf.reward.rewardRL[rewardKey].desc
                     +'* pour '+dairyConf.reward.rewardRL[rewardKey].cost+" "+dairyConf.reward.rewardEmoji+"\n";
            canReward = true;
        }
    }
    if (canReward) {
        bot.api.chat.postMessage({
            'channel':user.id,
            'text': "Tu peux obtenir un cadeau :\n"+msgTxt +'Tape "utiliser" pour obtenir ton cadeau.',
            'as_user':true
        });
    }
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