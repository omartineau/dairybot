![DAIRYbot](https://omartineau.github.io/dairy-bot.svg)

The bot that makes your team happy !

DairyBot is a recognition system for Slack : your team members reward each others and win gifts.

**Made with ♥ in Normady, France.**

## How it works

​Every days, each team member recives a :hatching_chick: that can be used to reward your colleagues. Send recognition in a channel (public or private)

> ​A big thanks :hatching_chick: to @john that help me to convince a prospect.

John will receive a direct message from the bot

> @olivier gives you a :hatched_chick:

And you'll receive also a confirmation

> You gave a :hatched_chick:to @john

When you have enough :hatched_chick:s, you can echange them for gifts.

You can configure all the gift you want in Dairybot, somes ideas :

- a snack (We ♥ Twix),
- an Amazon (or Starbuck, iTunes, Xbox, etc. ) gift card,
- a lunch with the CEO...

Be creative !

### Rules

- You can give several rewards (​:hatching_chick:​ ​:hatching_chick:​to @john)
- ​You can give reward to several people (​:hatching_chick:​ to @john and @jim)
- You can not give reward you you dont have !
- ​You can accumulate :hatching_chick: (but a maximum is set)
- You can not give reward you received (:hatched_chick:)
- ​You can not give :hatching_chick: in a direct message.

##Install
###Clone git repo
```
git clone https://github.com/omartineau/dairybot
```
###Install modules

Install all the libraries needed by node and Dairybot.

```
npm install
```

### An easier way to install

- [Deployment on Clever Cloud](docs/hosting/clevercloud.md)

Soon... Other Paas platforms.

###Configure you bot and get you token

[In Slack, create a bot](https://slack.com/apps/build/custom-integration) named `dairy` and copy the API token.

**Invite dairy in each channel** needed to be monitored by your bot. You also need to create a private chanel `dairyadmin` and invite your bot inside with `/invite dairy`.

If you want to make reward easier, [create a alias](https://slack.com/customize/emoji) `:thanks:` for the one you use `:hatching_chick:` by default (:hatching_chick:)

## Personalize you Bot

### Config file

Duplicate the `config/dairybot.json` file, then launch your bot with the environnement `DairyBotConfig=new_conf_file.json` .

### Common section

- **botName** : name of the bot, as in Slack configuration
- **botTZ** : Time Zone of the Bot (currently unused)
- **cronHourUTC** and **cronMinuteUTC** : time of the reward delivery
- **giftHeardEmoji**  : emoji added in reaction, when a reward is noticed by the bot ( :robot_face: )
- **adminChanel** : private channel use to notify admin when a use get his gift (*dairyadmin* by default)
- **adminUser** : list of admin users (currently unused)
- **excludedUser** : list of users that will not take part of the system
- **excludedChannel** : list of channels where the bot can not be invited
- **restrictedToUser** : only this users will take part (very usefull for test period)
- **restrictedToChannel** : if you want to limit the channels
- **utterances** : word used to say yes/no in bot conversation


### Reward section

- **recognitionByDay** : how many rewards are received each day (default : 1)
- **recognitionMax** : how many rewards can be cumulated (default 3)
- **excludedDays** : rewards are not given on those days (0 is sunday) (default weekend [6,0])
- **giftEmoji** : emoji used to give recognition (default 🐣)
- **giftEmojiAlias** : alias to make easy recognition (default `:thanks:` )
- **rewardEmoji** : emoji used to represent rewards (default :hatched_chick:)

### RewardRL section

Lists the gift that can be obtain in exchange of rewards :hatched_chick:

- **cost** : nomber of rewards required
- **desc** : gift description
- **getinfo** : explain how to get the gift in read life !
- **color** : hex color for the gifts list
- **thumb_url** : image url (size : 75px x 75px) for the gift list


##Launch
###Test
DairyBotToken=xoxp-123456-789012-??????-?????? node dairybot.js
###Install as a daemon
Ìnstall [forever](https://www.npmjs.com/package/forever) to make DairyBot persistent.
```
[sudo] npm install forever -g
```
Create `/etc/init.d/dairybot`.
Change the **DairyBotToken** and the **sourceDir**

```
#!/bin/sh
### BEGIN INIT INFO
# Provides:             dairybot
# Required-Start:       $syslog $remote_fs
# Required-Stop:        $syslog $remote_fs
# Should-Start:         $local_fs
# Should-Stop:          $local_fs
# Default-Start:        2 3 4 5
# Default-Stop:         0 1 6
# Short-Description:    Dairy Bot
# Description:          The ChatBot that makes your team happy
### END INIT INFO

#/etc/init.d/dairybot

export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules
# change du token below with yours
export DairyBotToken=xoxb-12345678-azertyuiopQSDFGHJKLM 

case "$1" in
  start)
  # change --sourceDir to set the path where you install dairybot
  exec forever --uid="dairybot" --sourceDir=/home/fermier/dairybot -p /var/run/fermier.pid dairybot.js 2>&1 > /dev/null &
  ;;
stop)
  exec forever stop dairybot 2>&1 > /dev/null
  ;;
*)
  echo "Usage: /etc/init.d/dairybot {start|stop}"
  exit 1
  ;;
esac

exit 0
```

Launch the daemon
```
/etc/init.d/dairybot start
```


###Restart

You can restart the daemon in command line to reload the configuration
```
/etc/init.d/dairybot stop
/etc/init.d/dairybot start
```

Or DM your bot in Slack, and say `restart` and confirm `yes`

## FAQ

### Dairybot didn't see some rewards

The bot need to be invited in each channal public ou private. You can also check if the bot is launched (the green bullet)

The bot can not see if you try to give reward through a direct message, Slack didn't allow it.



## How to contributes

You can help correcting typos, or complete the documentation, or even create new language (json file in /config).

I also want to create guides for easy installation on Paas ([Heroku](https://blog.heroku.com/how-to-deploy-your-slack-bots-to-heroku), [Google cloud platform](https://cloudplatform.googleblog.com/2016/03/three-ways-to-build-Slack-integrations-on-Google-Cloud-Platform.html), IBM [BlueMix](https://developer.ibm.com/bluemix/2016/06/06/slack-bots-built-using-node-red/), [Azure](https://azure.microsoft.com/en-us/blog/using-the-azure-webjobs-sdk-to-create-custom-slack-extensions/), [AWS](https://aws.amazon.com/fr/lambda/), [Clever Cloud](https://www.clever-cloud.com/doc/nodejs/nodejs/), DigitalOcean, Gandi...)

You can help to impove the code, of course. I'm new to NodeJS, it's realy a side project for me and I didn't plan to be a Node expert ;-). Pull request are welcome !

###Librairy

DairyBot is based on the Botkit library https://howdy.ai/botkit/