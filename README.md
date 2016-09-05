#DairyBot
The bot that makes your team happy !

DairyBot is a reward system for Slack : your team members reward each other and win gifts.

**Made with ♥ in Normady, France.**

##Install
###Clone git repo
```
git clone https://github.com/omartineau/dairybot
```
###Composer
```
composer install
```

###Configure you bot and get you token
https://dairybot.slack.com/apps/build/custom-integration

Create a bot named `dairybot` and copy the token

##Launch
###Test
DairyBotToken=xoxp-123456-789012-??????-?????? node dairybot.js
###Install as a daemon
Ìnstall [forever](https://www.npmjs.com/package/forever) to make DairyBot persistent.
```
[sudo] npm install forever -g
```
Create /etc/init.d/dairybot.
Change the token and the sourceDir
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


##Configure

Edit the config/dairybot.json` file

Then restart the daemon in command line
```
/etc/init.d/dairybot stop
/etc/init.d/dairybot start
```

Or DM your bot in Slack, and say `restart` and confirm `yes`




