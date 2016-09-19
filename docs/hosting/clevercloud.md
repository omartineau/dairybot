# Clever Cloud hosting

You can easily host your bot on Clever Cloud.

Follow this steps :

1. **Fork** [Dairybot](https://github.com/omartineau/dairybot) on Github

2. **Create** **your accoung** on [Clever Cloud](https://www.clever-cloud.com/) (with you Github account)

3. **Create** **a FS-bucket** in your Clever Cloud console (*Add an add-on*)
   Allows the persistance of the data Dairybot stores in files

4. **Copy** the *bucket_host* id line
   `  "bucket_host": "bucket-f59641e7-9ab0-4b66-ba3d-0a11325cb349-fsbucket.services.clever-cloud.com",`

5. **Paste** this line in the `clevercloud/buckets.json` file of your Dairybot fork (commit and push...)

6. **Add an application** in your Clever Cloud console
   Via Github - it's a NodeJS App - don't creation an other FS-bucket

7. **Add an environement variable** **DairyBotToken** for your Slackbot token key

8. **Link the FS-bucket** (previously created) in *Service dependencies*

9. You probably **need to restart** the deployment (in *Overview* )

**That's all !**
Your bot must works, and gaves you a reward (via direct message).

You can also check *Logs* in Clever Cloud console if you have `info: ** API CALL: https://slack.com/api/users.list`

