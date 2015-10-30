// ==UserScript==
// @name         Plex External Player
// @namespace    https://github.com/Kayomani/PlexExternalPlayer
// @version      1.0
// @description  Play plex videos in an external player
// @author       Kayomani
// @include     /^https?://.*:32400/web.*
// @grant       GM_xmlhttpRequest
// ==/UserScript==

var makeRequest = function(url){
   return new Promise( function (resolve, reject) {
       GM_xmlhttpRequest({
           method: "GET",
           url: url,
           onload: resolve,
           onerror: reject
       });
   });    
};

var logMessage = function(msg){
    console.log('Plex External: ' + msg);   
};

var markAsPlayedInPlex = function(id) {
    var url =  window.location.origin + '/:/scrobble?key='+ id +'&identifier=com.plexapp.plugins.library'
    logMessage('Marking ' + id + ' as played');
    return makeRequest(url);
};

var playFileUsingAgent = function(path, id) {
    logMessage('Playing ' + path);
    var url = 'http://localhost:7251/' + btoa(path);
     return new Promise(function (resolve, reject) {
         makeRequest(url).then(function(){
             markAsPlayedInPlex(id).then(resolve, reject);
         },reject);
     });
};

var clickListener = function(e) {
    e.preventDefault();
    e.stopPropagation();
    var a = jQuery(e.target).closest('a');
    var link = a.attr('href');
    var url = link;
    if (link === '#' || link === undefined) {
        url = window.location.hash;
    }

    if (url.indexOf('%2Fmetadata%2F') > -1) {
        var idx = url.indexOf('%2Fmetadata%2F');
        var id = url.substr(idx + 14);

        var url =
        // Get metadata
        makeRequest(window.location.origin + '/library/metadata/' + id + '?checkFiles=1&includeExtras=1')
        .then(function(response){
             // Play the first availible part
             var parts = response.responseXML.getElementsByTagName('Part');
                for (var i = 0; i < parts.length; i++) {
                    if (parts[i].attributes['file'] !== undefined) {
                        playFileUsingAgent(parts[i].attributes['file'].value, id);
                        return;
                    }
                }

                if (parts.length === 0) {
                    // If we got a directory/Season back then get the files in it
                    var dirs = response.responseXML.getElementsByTagName('Directory');
                    if (dirs.length > 0) {
                          makeRequest(window.location.origin + dirs[0].attributes['key'].value)
                          .then(function(response){
                               var videos = response.responseXML.getElementsByTagName('Video');
                                var file = null;
                                var id = null;
                                for (var i = 0; i < videos.length; i++) {
                                    var vparts = videos[i].getElementsByTagName('Part');
                                    if (vparts.length > 0) {
                                        file = vparts[0].attributes['file'].value;
                                        id = vparts[0].attributes['id'].value;
                                        if (videos[i].attributes['lastViewedAt'] === null || videos[i].attributes['lastViewedAt'] === undefined) {
                                            break;
                                        }
                                    }
                                }

                                if (file !== null) {
                                    playFileUsingAgent(file, id);
                                }
                          });
                    }
                } 
        });
    }
};

var bindClicks = function() {
    jQuery(".glyphicon.play").each(function(i, e) {
        e = jQuery(e);
        if (!e.hasClass('plexextplayer')) {
            if (!e.parent().hasClass('hidden')) {
                e.addClass('plexextplayer');
                var parent = e.parent().parent();
                if (parent.is('li')) {
                    var template = jQuery('<li><a class="btn-gray" href="#" title="Play Externally" data-toggle="Play Externally" data-original-title="Play Externally"><i style="color: #41D677" class="glyphicon play plexextplayer plexextplayerico"></i></a></li>');
                    parent.after(template);
                    template.click(clickListener);
                } else if (parent.is('div') && parent.hasClass('media-poster-actions')) {

                    var template = jQuery('<button class="play-btn media-poster-btn btn-link" tabindex="-1"><i  style="color: #41D677"  class="glyphicon play plexextplayer plexextplayerico"></i></button>');
                    parent.prepend(template);
                    template.click(clickListener);
                }
            }
        }
    });
};

// Make buttons smaller
jQuery('body').append('<style>.media-poster-btn { padding: 8px !important; }</style>');

// Bind buttons and check for new ones every 100ms
setInterval(bindClicks, 100);
bindClicks();