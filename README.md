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

![screenshot](http://i.imgur.com/YZr2pbk.png "screenshot")