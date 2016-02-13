// ==UserScript==
// @name         Plex External Player
// @namespace    https://github.com/Kayomani/PlexExternalPlayer
// @version      1.4
// @description  Play plex videos in an external player
// @author       Kayomani
// @include     /^https?://.*:32400/web.*
// @include     http://*:32400/web/index.html*
// @require     http://code.jquery.com/jquery-1.11.3.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==

$("head").append (
    '<link href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" rel="stylesheet" type="text/css">'
);


toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": true,
    "progressBar": true,
    "positionClass": "toast-bottom-right",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "5000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
};
  
var showToast = function(msg, error){
   var title = 'Plex External Player';
   if(error){
     toastr.error(msg, title, {timeOut: 10000});  
     logMessage(msg);
   } else {
     toastr.success(msg, title);
   }  
};

var logMessage = function(msg){
    console.log('Plex External: ' + msg);   
};

var makeRequest = function(url){
   return new Promise( function (resolve, reject) {
       GM_xmlhttpRequest({
           method: "GET",
            headers: {
                "X-Plex-Token":localStorage["myPlexAccessToken"]
            },
           url: url,
           onload: resolve,
           onreadystatechange: function(state) {
               if (state.readyState === 4) {
                   if (state.status !== 200) {
                        showToast('Error calling: ' + url + '. Response: ' + error.responseText + ' Code:' + error.status + ' Message: ' + error.statusText, 1);  
                   } 
               } 
               
           },
           onerror:  reject
       });
   });    
};



var markAsPlayedInPlex = function(id) {
    logMessage('Marking ' + id + ' as played');
    return makeRequest(window.location.origin + '/:/scrobble?key='+ id +'&identifier=com.plexapp.plugins.library').catch(function(){
        showToast('Failed to mark item ' + id + ' as played');
    });
};

var openItemOnAgent = function(path, id, openFolder) {
     if(openFolder){
         var fwd = path.lastIndexOf('/');
         var bck = path.lastIndexOf('\\');
         var best = fwd>bck?fwd:bck;
         if(best>-1){
             path = path.substr(0, best);   
         }                                        
     }
    showToast('Playing ' + path, 0);
    logMessage('Playing ' + path);
    var url = 'http://localhost:7251/?protocol=1&item=' + encodeURIComponent(path);
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
    var openFolder = a.attr('data-type') === 'folder';
  
    var url = link;
    if (link === '#' || link === undefined) {
        url = window.location.hash;
    }

    if (url.indexOf('%2Fmetadata%2F') > -1) {
        var idx = url.indexOf('%2Fmetadata%2F');
        var id = url.substr(idx + 14);

        // Get metadata
        var metaDataPath = window.location.origin + '/library/metadata/' + id + '?checkFiles=1&includeExtras=1';
        makeRequest(metaDataPath)
        .then(function(response){
             // Play the first availible part
             var parts = response.responseXML.getElementsByTagName('Part');
                for (var i = 0; i < parts.length; i++) {
                    if (parts[i].attributes['file'] !== undefined) {
                        openItemOnAgent(parts[i].attributes['file'].value, id, openFolder).catch(function(){
                              showToast('Failed to connect to agent, is it running or firewalled?',1);
                          });
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
                                    openItemOnAgent(file, id, openFolder).catch(function(){
                              showToast('Failed to connect to agent, is it running or firewalled?',1);
                          });
                                }
                          }).catch(function(){
                              showToast('Failed to get information for directory',1);
                          });
                    }
                } 
        }, function(error){
            showToast('Error getting metadata from' + metaDataPath, 1);   
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
                    var template = jQuery('<li><a class="btn-gray" href="#" title="Play Externally" data-toggle="Play Externally" data-original-title="Play Externally"><i class="glyphicon play plexextplayer plexextplayerico"></i></a></li><li><a class="btn-gray" href="#" title="Open containing folder" data-type="folder" data-toggle="Play Externally" data-original-title="Open containing folder"><i class="glyphicon play plexextplayer plexfolderextplayerico"></i></a></li>');
                    parent.after(template);
                    template.click(clickListener);
                } else if (parent.is('div') && parent.hasClass('media-poster-actions')) {
                    var template = jQuery('<button class="play-btn media-poster-btn btn-link" tabindex="-1"><i class="glyphicon play plexextplayer plexextplayerico"></i></button>');
                    parent.prepend(template);
                    template.click(clickListener);
                }
            }
        }
    });
};

// Make buttons smaller
jQuery('body').append('<style>.media-poster-btn { padding: 8px !important; } .glyphicon.plexfolderextplayerico:before {  content: "\\e343";   } .glyphicon.plexextplayerico:before {  content: "\\e161";   }</style>');

// Bind buttons and check for new ones every 100ms
setInterval(bindClicks, 100);
bindClicks();