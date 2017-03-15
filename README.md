# External plex player

This is a plex modification that allows for browsing using the web interface but then opting to play files in your standard media player.

### How does it work?
The script add a button to next to play in the plex web interface (Not via plex.tv) which asks plex where the file you want to play lives.  It then passes the file to the agent which then runs it in your normal media player.  Note this current requires you have the paths in plex as a network share if you are playing files not local to your computer or use mapped drives as a work around. 

### Installation
1. Install Chrome or Firefox
2. Install [TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) (Chrome) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) (Firefox).
3. Install the agent using the installer from the releases page above. Requires .Net 4.5 on Windows, may work on Linux/mono.
4. Install the script from github or [GreasyFork](https://greasyfork.org/en/scripts/13437-plex-external-player)
5. Refresh any existing plex pages you have open.

![screenshot](http://i.imgur.com/sm49By9.png "screenshot")

### Tweaking
* Custom domain

     If you've set your Plex server on a custom domain (ex. plex.mydomain.com - note no port number), you can modify the script to activate your website by changing the @include parameters. I use ssl with nginx to proxy_pass my subdomain to plex, so here's what I use:
  
    ```js
    // ==UserScript==
    // ...
    // @include   /^https?://.*:32400/web.*
    // @include   http://*:32400/web/index.html*
    // @include		/^https?://plex.mydomain.com/web.*
    // @include		https://plex.mydomain.com/web/index.html*
    // ...
    // ==/UserScript==
    ```
* Playing from a remote server
  
  You can map a network drive or use the alternative below.  Note that the drive name must match or you will need to add the replace line below. 
  
    To use this script with a remote server, several things must be changed. Essentially, you mount your remote media directory to your local filesystem using sshfs, and then add a line in the script to rewrite the path where it will look for the file.
    * Install [DokanSetup_redist.exe](https://github.com/dokan-dev/dokany/releases/tag/v1.0.0-RC1)
      * Check to make sure vcredist x86 and x64 are installed. If they aren't, install both from [Microsoft, here](https://www.microsoft.com/download/details.aspx?id=48145)
    * Download [win-sshfs](https://github.com/dimov-cz/win-sshfs/releases/tag/1.6.0) and unpack it somewhere.
      * Run win-sshfs, press add, enter a drive name, your server host address, ssh port, username, and choose an authentication method.
      * In "Directory", enter the path on the remote server where your library is (ex. /home/user/media). This may just be the server root, depending on how scattered your libraries are.
      * Choose a drive letter, it doesn't matter which but keep it in mind.
      * SAVE the configuration (this is important), then press MOUNT.
      * Check in explorer that when you open the drive you can see your media folders (E:\Series1, E:\Series2, etc.)
    * Find the following chunk in the script, and add the indicated line
    
      ```js
      var openItemOnAgent = function(path, id, openFolder) {
      path = path.replace('\/home\/user\/media', 'E:\\'); <---
      if(openFolder){
        var fwd = path.lastIndexOf('/');
        var bck = path.lastIndexOf('\\');
        var best = fwd>bck?fwd:bck;
        if(best>-1){
         path = path.substr(0, best);   
        }                                        
      }
      ```
      * You will need to replace the given paths with your own. Make sure to escape your characters.
      * When the script passes the file path to the agent, it substitutes the drive we mapped from before. So, ```/home/user/media/series1/episode1.mp4``` becomes ```E:\series1\episode1.mp4```
      * If you run into difficulty with this step, the agent should give you a helpful error message saying it cannot find the file at ```/some/location```. Using this, you can correct the .replace() to substitute the proper path.
