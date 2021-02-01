# Disable battery saving in non-stock Android phones

Certain apps need to do their job in the background (without user interaction). This behaviour is
usually restricted by battery optimization strategies implemented by Android. In addition, manufacturers
(OEMs, e.g. Xiaomi, Samsung, Huawei, etc.) add their own battery optimization strategies, which differ from one version
to another within the same manufacturer. While Android's battery optimization strategy can be disabled programmatically (by asking the user), 
other manufacturer's strategies cannot.

The most common mechanism that OEMs (e.g. Xiaomi, Huawei/Honor, OnePlus...) implements is the *Auto-launch* setting. These settings, by default,
avoid an app to be able to be launched and run in the background. Others, like Samsung, are just disabling those apps
that are not being used for a while.

It is hard to provide a complete guide to disable these settings, but here you can find some resources that may help:

- [**DontKillMyApp**](https://dontkillmyapp.com): website that provides guidance through disabling the battery
optimization settings for several manufacturers and versions. They also have an [app](https://play.google.com/store/apps/details?id=com.urbandroid.dontkillmyapp&pcampaignid=pcampaignidMKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1) 
which analyses how aggressively is your phone closing background apps.
 
- [**DriveQuant - Support Centre**](https://drivequant.zendesk.com/hc/en-gb/sections/360002126919-Smartphone-settings): 
framework that provides to developers tools to analyze vehicle trips and driving style. As their technology is smartphone
sensor based, they suffer smartphone's battery optimizations. So, they provide guides to disable battery optimization settings
for several OEMs.
 
- [**AutoStarter**](https://github.com/judemanutd/AutoStarter): it's a library developed by [Jude Fernandes](https://github.com/judemanutd)
that helps bring up the autostart permission manager for different OEMs to the user so they can add an app to autostart.
Although it does not always works on every OEM version, it's a nice tool that developers can integrate in their apps to
add a way to disable de *Auto-launch* setting. We are investigating if it can be integrated into this plugin.

> In summary, if your app needs to run in background or trigger alarms, make sure to tell your users to add your app to the battery optimizer white list and to allow it to start in background (*auto-launch* setting).

## Special considerations
Samsung limits by default scheduled jobs to a minimum interval of 5 minutes if screen's device is off. For example,
if you set up a task to be executed in 2 minutes, it will be scheduled to run in 5 minutes if the device screen is off.

This behaviour can be avoided with one simple trick: just add the keyword **alarm**/**alert**/**clock** in our app package name
(e.g. com.example.**alarm**.myapp, com.example.myapp**alert**, etc.).
Packages containing these keywords are whitelisted by Samsung and are able run (apparently) without restrictions.

It's something yet to be explored if other manufacturers act in the same way Samsung does, or if they have similar tricks.