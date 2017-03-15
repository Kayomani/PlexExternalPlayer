// ==UserScript==
// @name         Plex External Player
// @namespace    https://github.com/Kayomani/PlexExternalPlayer
// @version      1.11
// @description  Play plex videos in an external player
// @author       Kayomani
// @include     /^https?://.*:32400/web.*
// @include     http://*:32400/web/index.html*
// @require     http://code.jquery.com/jquery-1.11.3.min.js
// @connect     *
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
    }
    else
    {
        toastr.success(msg, title);
    }
};

var logMessage = function(msg){
    console.log('[Plex External] ' + msg);
};

var makeRequest = function(url, user, server){
    return new Promise( function (resolve, reject) {
        var origAccessToken = localStorage.myPlexAccessToken;
        var serverNode = JSON.parse(localStorage.users);
        var tokenToTry = origAccessToken;
        if(serverNode===undefined)
        {
            serverNode = {
                users : []
            };
        }

        if(user!==undefined && server !==undefined)
        {
            if(user < serverNode.users.length)
            {
                if(server < serverNode.users[user].servers.length)
                {
                    tokenToTry = serverNode.users[user].servers[server].accessToken;
                }
                else
                {
                    showToast('Could not find authentication info', 1);
                    reject();
                    return;
                }
            }
            else
            {
                showToast('Could not find authentication info', 1);
                reject();
                return;
            }
        }
        var onError =  function()
        {
            if(user===undefined)
            {
                user = 0;
                server = 0;
            } else
            {
                server++;
                if(serverNode.users[user].servers.length===server)
                {
                    user++;
                    server = 0;
                }
            }
            makeRequest(url,user,server).then(resolve, reject);
        };
        
        logMessage('Calling ' + url +' clientId ' + localStorage.clientID + 'Token ' + tokenToTry);
        GM_xmlhttpRequest({
            method: "GET",
            headers: headers = {
                "X-Plex-Client-Identifier":localStorage.clientID,
                "X-Plex-Token":tokenToTry

            },
            url: url,
            onload: function(state){
                if (state.status === 200) {
                      logMessage('Called sucessfully to ' + url);
                    resolve(state);
                }
            },
            onreadystatechange: function(state) {
                if (state.readyState === 4) {
                    
                    if(state.status === 401)
                    {
                        logMessage('Not Authorised ' + url);
                        onError();
                    } else if (state.status !== 200) {
                     logMessage('Request returned ' + state.status);
                        showToast('Error calling: ' + url + '. Response: ' + state.responseText + ' Code:' + state.status + ' Message: ' + state.statusText, 1);
                    } 
                }
            },
            onerror: onError
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
    // umicrosharp doesn't handle plus properly
    path = path.replace(/\+/g, '[PLEXEXTPLUS]');
    var url = 'http://127.0.0.1:7251/?protocol=2&item=' + encodeURIComponent(path);
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
    var openFolder = jQuery(e.target).attr('data-type') === 'folder';
    var url = link;
    if (link === '#' || link === undefined || link === 'javascript:void(0)') {
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
                        if(videos.length === 0)
                        {
                            showToast('Could not determine which video to play as there are multiple seasons.',true);
                            return;
                        }
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

                        if (file !== null)
                        {
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
            showToast('Error getting metadata from ' + metaDataPath + "Error: " + error, 1);
            logMessage('Error ' + JSON.stringify(error));
        });
    }
};

var bindClicks = function() {
    var hasBtn = false;
    var toolBar= jQuery(".plex-icon-toolbar-play-560").parent().parent();
    toolBar.children('button').each(function(i, e) {
        if(jQuery(e).hasClass('plexextplayer'))
            hasBtn = true;
    });


    if(!hasBtn)
    {
        var template = jQuery('<button class="play-btn media-poster-btn btn-link plexextplayer" tabindex="-1" title="Play Externally"><i class="glyphicon play plexextplayer plexextplayerico"></i></button><button class="play-btn media-poster-btn btn-link plexextplayer" title="Open folder" tabindex="-1"><i  data-type="folder" class="glyphicon play plexextplayer plexfolderextplayerico"></i></button>');
        toolBar.prepend(template);
        template.click(clickListener);

    }

    // Cover page
    jQuery(".plex-icon-more-560").each(function(i, e) {
        e = jQuery(e);
        var poster = e.parent().parent();
        if(poster.length === 1 && poster[0].className.startsWith('MetadataPosterCardOverlay'))
        {
            var existingButton = poster.find('.plexextplayerico');
            if(existingButton.length === 0)
            {
                var url = poster.find('a').attr('href');
                var template = jQuery('<a href="'+ url +'" aria-haspopup="false"  aria-role="button" class="" type="button"><i class="glyphicon play plexextplayer plexextplayerico plexextplayericocover"></i></button>'); 
                var newButton = template.appendTo(poster);
                newButton.click(clickListener);
                poster.mouseenter(function(){
                    newButton.find('i').css('display','block');
                });
                poster.mouseleave(function(){
                    newButton.find('i').css('display','none');
                });
            }
        }
    });
};

// Make buttons smaller
jQuery('body').append('<style>.plexextplayericocover {right: 10px; top: 10px; position:absolute; display:none;font-size:15px;} .glyphicon.plexfolderextplayerico:before {  content: "\\e145";   } .glyphicon.plexextplayerico:before {  content: "\\e161";   }</style>');

// Bind buttons and check for new ones every 100ms
setInterval(bindClicks, 100);
bindClicks();